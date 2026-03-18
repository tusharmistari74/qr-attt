import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'motion/react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs'
import { useAuth } from '../contexts/AuthContext'
import { Shield, GraduationCap, Smartphone, Eye, EyeOff, Loader2 } from 'lucide-react'

export function LoginPage() {
  const { login, studentLogin, requestOtp } = useAuth()
  const navigate = useNavigate()
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showForgotPassword, setShowForgotPassword] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  
  // Admin/Teacher login state
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  
  // Student login state
  const [mobileNumber, setMobileNumber] = useState('')
  const [otp, setOtp] = useState('')
  const [otpSent, setOtpSent] = useState(false)
  const [otpTimer, setOtpTimer] = useState(0)

  // Start OTP timer
  const startOtpTimer = () => {
    setOtpTimer(300) // 5 minutes
    const interval = setInterval(() => {
      setOtpTimer(prev => {
        if (prev <= 1) {
          clearInterval(interval)
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }

  const handleAdminLogin = async () => {
    if (!email || !password) {
      setError('Please fill in all fields')
      return
    }

    setIsLoading(true)
    setError('')

    const result = await login(email, password, 'admin')

    if (result.success) {
      navigate('/admin')
    } else {
      setError(result.error || 'Invalid admin credentials')
    }

    setIsLoading(false)
  }

  const handleTeacherLogin = async () => {
    if (!email || !password) {
      setError('Please fill in all fields')
      return
    }

    setIsLoading(true)
    setError('')

    const result = await login(email, password, 'teacher')

    if (result.success) {
      navigate('/teacher')
    } else {
      setError(result.error || 'Invalid teacher credentials')
    }

    setIsLoading(false)
  }

  const handleRequestOtp = async () => {
    if (!mobileNumber || mobileNumber.length !== 10) {
      setError('Please enter a valid 10-digit mobile number')
      return
    }

    setIsLoading(true)
    setError('')
    try {
      const res: any = await requestOtp(mobileNumber)
      console.log('requestOtp response:', res)

      if (res && res.success) {
        setOtpSent(true)
        // If the API returned the OTP (mock/dev), show it so testers can enter it
        if (res.otp) {
          setSuccess(`OTP sent (dev): ${res.otp}`)
        } else {
          setSuccess('OTP sent successfully! Check your messages.')
        }
        startOtpTimer()
      } else {
        const errMsg = res?.error || 'Failed to send OTP. Please check your mobile number.'
        setError(errMsg)
      }
    } catch (err: any) {
      console.error('Request OTP error:', err)
      setError(err?.message || 'Failed to send OTP. Please try again.')
    }
    
    setIsLoading(false)
  }

  const handleStudentLogin = async () => {
    if (!otp || otp.length !== 6) {
      setError('Please enter a valid 6-digit OTP')
      return
    }

    setIsLoading(true)
    setError('')

    const success = await studentLogin(mobileNumber, otp)

    if (success) {
      navigate('/student')
    } else {
      setError('Invalid or expired OTP')
    }

    setIsLoading(false)
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#3B0A45] to-[#2B0230] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <Card className="bg-white/10 backdrop-blur-md border-white/20">
          <CardHeader className="text-center">
            <CardTitle className="text-white text-2xl font-bold uppercase">
              Attendance System
            </CardTitle>
            <CardDescription className="text-white/80">
              Sign in to access your account
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            <Tabs defaultValue="student" className="w-full">
              <TabsList className="grid w-full grid-cols-3 bg-white/10">
                <TabsTrigger value="student" className="text-white data-[state=active]:bg-white data-[state=active]:text-[#3B0A45]">
                  <Smartphone className="w-4 h-4 mr-2" />
                  Student
                </TabsTrigger>
                <TabsTrigger value="teacher" className="text-white data-[state=active]:bg-white data-[state=active]:text-[#3B0A45]">
                  <GraduationCap className="w-4 h-4 mr-2" />
                  Teacher
                </TabsTrigger>
                <TabsTrigger value="admin" className="text-white data-[state=active]:bg-white data-[state=active]:text-[#3B0A45]">
                  <Shield className="w-4 h-4 mr-2" />
                  Admin
                </TabsTrigger>
              </TabsList>

              {/* Student Login */}
              <TabsContent value="student" className="space-y-4 mt-6">
                <AnimatePresence mode="wait">
                  {!otpSent ? (
                    <motion.div
                      key="mobile"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      className="space-y-4"
                    >
                      <div>
                        <label className="text-white text-sm font-medium block mb-2">
                          Mobile Number
                        </label>
                        <Input
                          type="tel"
                          placeholder="Enter 10-digit mobile number"
                          value={mobileNumber}
                          onChange={(e) => setMobileNumber(e.target.value.replace(/\D/g, '').slice(0, 10))}
                          className="bg-white/10 border-white/20 text-white placeholder:text-white/60"
                          maxLength={10}
                        />
                      </div>
                      
                      <Button
                        onClick={handleRequestOtp}
                        disabled={isLoading || mobileNumber.length !== 10}
                        className="w-full bg-[#D9D9D9] text-black hover:bg-[#C0C0C0] font-bold uppercase"
                      >
                        {isLoading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Sending OTP...
                          </>
                        ) : (
                          'Send OTP'
                        )}
                      </Button>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="otp"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="space-y-4"
                    >
                      <div>
                        <label className="text-white text-sm font-medium block mb-2">
                          Enter OTP
                        </label>
                        <Input
                          type="text"
                          placeholder="Enter 6-digit OTP"
                          value={otp}
                          onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                          className="bg-white/10 border-white/20 text-white placeholder:text-white/60 text-center text-2xl tracking-widest"
                          maxLength={6}
                        />
                      </div>
                      
                      {otpTimer > 0 && (
                        <div className="text-center text-white/80 text-sm">
                          OTP expires in: {formatTime(otpTimer)}
                        </div>
                      )}
                      
                      <div className="flex gap-2">
                        <Button
                          onClick={() => {
                            setOtpSent(false)
                            setOtp('')
                            setOtpTimer(0)
                          }}
                          variant="outline"
                          className="flex-1 bg-transparent border-white/20 text-white hover:bg-white/10"
                        >
                          Back
                        </Button>
                        
                        <Button
                          onClick={handleStudentLogin}
                          disabled={isLoading || otp.length !== 6}
                          className="flex-1 bg-[#D9D9D9] text-black hover:bg-[#C0C0C0] font-bold uppercase"
                        >
                          {isLoading ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Verifying...
                            </>
                          ) : (
                            'Login'
                          )}
                        </Button>
                      </div>
                      
                      {otpTimer === 0 && (
                        <Button
                          onClick={handleRequestOtp}
                          variant="outline"
                          className="w-full bg-transparent border-white/20 text-white hover:bg-white/10"
                        >
                          Resend OTP
                        </Button>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </TabsContent>

              {/* Teacher Login */}
              <TabsContent value="teacher" className="space-y-4 mt-6">
                <div>
                  <label className="text-white text-sm font-medium block mb-2">
                    Email Address
                  </label>
                  <Input
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="bg-white/10 border-white/20 text-white placeholder:text-white/60"
                  />
                </div>
                
                <div>
                  <label className="text-white text-sm font-medium block mb-2">
                    Password
                  </label>
                  <div className="relative">
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="bg-white/10 border-white/20 text-white placeholder:text-white/60 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-white/60 hover:text-white/80"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
                
                <Button
                  onClick={handleTeacherLogin}
                  disabled={isLoading}
                  className="w-full bg-[#D9D9D9] text-black hover:bg-[#C0C0C0] font-bold uppercase"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Signing In...
                    </>
                  ) : (
                    'Sign In as Teacher'
                  )}
                </Button>
              </TabsContent>

              {/* Admin Login */}
              <TabsContent value="admin" className="space-y-4 mt-6">
                <div>
                  <label className="text-white text-sm font-medium block mb-2">
                    Admin Email
                  </label>
                  <Input
                    type="email"
                    placeholder="Enter admin email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="bg-white/10 border-white/20 text-white placeholder:text-white/60"
                  />
                </div>
                
                <div>
                  <label className="text-white text-sm font-medium block mb-2">
                    Admin Password
                  </label>
                  <div className="relative">
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Enter admin password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="bg-white/10 border-white/20 text-white placeholder:text-white/60 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-white/60 hover:text-white/80"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
                
                <Button
                  onClick={handleAdminLogin}
                  disabled={isLoading}
                  className="w-full bg-[#D9D9D9] text-black hover:bg-[#C0C0C0] font-bold uppercase"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Signing In...
                    </>
                  ) : (
                    'Sign In as Admin'
                  )}
                </Button>
              </TabsContent>
            </Tabs>

            {/* Error/Success Messages */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="mt-4 p-3 bg-red-500/20 border border-red-500/30 rounded-lg text-red-300 text-sm text-center"
                >
                  {error}
                </motion.div>
              )}
              
              {success && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="mt-4 p-3 bg-green-500/20 border border-green-500/30 rounded-lg text-green-300 text-sm text-center"
                >
                  {success}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Forgot Password Link */}
            <div className="mt-4 text-center">
              <button
                onClick={() => setShowForgotPassword(true)}
                className="text-white/60 hover:text-white/80 text-sm"
              >
                Forgot password?
              </button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}