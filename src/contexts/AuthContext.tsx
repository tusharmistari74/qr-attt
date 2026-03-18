import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { apiClient, User } from '../utils/api'

declare global {
  interface Window {
    recaptchaVerifier: any;
  }
}

interface AuthContextType {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (email: string, password: string, role: 'admin' | 'teacher') => Promise<{success: boolean, error?: string}>
  studentLogin: (mobileNumber: string, otp: string) => Promise<any>
  requestOtp: (mobileNumber: string) => Promise<any>
  logout: () => Promise<void>
  refreshSession: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const isAuthenticated = !!user

  // Check for existing session on app load
  useEffect(() => {
    checkExistingSession()
  }, [])

  const checkExistingSession = async () => {
    try {
      setIsLoading(true)
      
      // Enhanced localStorage access with error handling for embedded environments
      let storedToken = null
      try {
        storedToken = localStorage.getItem('auth_token')
      } catch (storageError) {
        console.warn('localStorage access failed, possibly in embedded environment:', storageError)
        setIsLoading(false)
        return
      }

      if (!storedToken) {
        console.log('No stored token found')
        setIsLoading(false)
        return
      }

      console.log('Found stored token, verifying session...')
      apiClient.setToken(storedToken)
      
      // Add timeout to prevent hanging in embedded environments
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Session verification timeout')), 10000)
      )
      
      const response = await Promise.race([
        apiClient.verifySession(),
        timeoutPromise
      ])
      
      if (response.success && response.user) {
        console.log('Session verified successfully for user:', response.user.name)
        setUser(response.user)
      } else {
        console.log('Session verification failed:', response.error || response.message)
        console.log('Full response:', response)
        localStorage.removeItem('auth_token')
        apiClient.clearToken()
      }
    } catch (error) {
      console.log('Session verification error:', error)
      // Clear potentially invalid session data
      try {
        localStorage.removeItem('auth_token')
      } catch (storageError) {
        console.warn('Failed to clear localStorage:', storageError)
      }
      apiClient.clearToken()
    } finally {
      setIsLoading(false)
    }
  }

  const login = async (email: string, password: string, role: 'admin' | 'teacher'): Promise<{success: boolean, error?: string}> => {
    try {
      setIsLoading(true)
      
      let response
      if (role === 'admin') {
        response = await apiClient.adminLogin(email, password)
      } else {
        response = await apiClient.teacherLogin(email, password)
      }

      console.log('AuthContext.login response:', response)

      if (response.success && response.user && response.token) {
        // Ensure token is properly set in the API client
        apiClient.setToken(response.token)
        console.log('Login successful, token set:', response.token.substring(0, 10) + '...')
        setUser(response.user)
        return { success: true }
      }
      
      return { success: false, error: response.error || 'Invalid credentials' }
    } catch (error) {
      console.error('Login error:', error)
      return { success: false, error: String(error) }
    } finally {
      setIsLoading(false)
    }
  }

  const [confirmationResult, setConfirmationResult] = useState<any>(null);

  const requestOtp = async (mobileNumber: string): Promise<any> => {
    try {
      // Import here to avoid early initialization issues before auth is ready
      const { RecaptchaVerifier, signInWithPhoneNumber } = await import('firebase/auth');
      const { auth } = await import('../firebase');

      if (!window.recaptchaVerifier) {
        window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
          'size': 'invisible',
        });
      }
      
      const appVerifier = window.recaptchaVerifier;
      const formattedNumber = mobileNumber.startsWith('+') ? mobileNumber : `+91${mobileNumber}`;
      
      const confirmation = await signInWithPhoneNumber(auth, formattedNumber, appVerifier);
      setConfirmationResult(confirmation);
      return { success: true };
    } catch (error) {
      console.error('OTP request error:', error);
      // Reset recaptcha if error occurs so user can try again
      if (window.recaptchaVerifier) {
        window.recaptchaVerifier.clear();
        window.recaptchaVerifier = null;
      }
      return { success: false, error: (error as any)?.message || String(error) };
    }
  }

  const studentLogin = async (mobileNumber: string, otp: string): Promise<any> => {
    try {
      setIsLoading(true);
      
      if (!confirmationResult) {
        console.error("No confirmation result available. Please request OTP first.");
        return false;
      }
      
      // 1. Verify OTP with Firebase
      await confirmationResult.confirm(otp);
      
      // 2. Obtain JWT session token from our backend
      const response = await apiClient.studentFirebaseLogin(mobileNumber);

      if (response && response.success && response.user && response.token) {
        apiClient.setToken(response.token);
        console.log('Student login successful, token set:', response.token.substring(0, 10) + '...');
        setUser(response.user);
        return { success: true };
      }
      
      return { success: false, error: response?.error || 'Authentication failed' };
    } catch (error) {
      console.error('Student login error:', error);
      return { success: false, error: String(error) };
    } finally {
      setIsLoading(false);
    }
  }

  const logout = async () => {
    try {
      await apiClient.logout()
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      setUser(null)
      apiClient.clearToken()
    }
  }

  const refreshSession = async () => {
    await checkExistingSession()
  }

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated,
    login,
    studentLogin,
    requestOtp,
    logout,
    refreshSession,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}