import React, { useEffect, useRef, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Camera, AlertCircle, CheckCircle, XCircle } from 'lucide-react'
import { motion, AnimatePresence } from 'motion/react'

interface QRScannerWrapperProps {
  onScanSuccess: (data: string) => void
  onScanError?: (error: string) => void
  isActive: boolean
}

export function QRScannerWrapper({ onScanSuccess, onScanError, isActive }: QRScannerWrapperProps) {
  const [isScanning, setIsScanning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasPermission, setHasPermission] = useState<boolean | null>(null)
  const scannerRef = useRef<HTMLDivElement>(null)
  const html5QrcodeScannerRef = useRef<any>(null)

  useEffect(() => {
    if (isActive && !isScanning) {
      initializeScanner()
    } else if (!isActive && html5QrcodeScannerRef.current) {
      stopScanner()
    }

    return () => {
      stopScanner()
    }
  }, [isActive])

  const initializeScanner = async () => {
    try {
      // Check for camera permission
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        try {
          await navigator.mediaDevices.getUserMedia({ video: true })
          setHasPermission(true)
        } catch (permError) {
          setHasPermission(false)
          setError('Camera permission denied. Please enable camera access in your browser settings.')
          return
        }
      } else {
        setError('Camera not supported on this device/browser.')
        return
      }

      // Dynamically import html5-qrcode to handle potential import issues
      const { Html5QrcodeScanner } = await import('html5-qrcode')

      if (scannerRef.current && !html5QrcodeScannerRef.current) {
        const scanner = new Html5QrcodeScanner(
          'qr-reader',
          {
            fps: 10,
            qrbox: {
              width: 250,
              height: 250,
            },
            aspectRatio: 1.0,
          },
          false
        )

        scanner.render(
          (decodedText: string) => {
            onScanSuccess(decodedText)
          },
          (errorMessage: string) => {
            // Don't show error for normal scanning process
            if (!errorMessage.includes('No QR code found')) {
              if (onScanError) {
                onScanError(errorMessage)
              }
            }
          }
        )

        html5QrcodeScannerRef.current = scanner
        setIsScanning(true)
        setError(null)
      }
    } catch (err: any) {
      console.error('Scanner initialization error:', err)
      setError(`Failed to initialize scanner: ${err.message}`)
      setIsScanning(false)
    }
  }

  const stopScanner = () => {
    if (html5QrcodeScannerRef.current) {
      try {
        html5QrcodeScannerRef.current.clear()
        html5QrcodeScannerRef.current = null
        setIsScanning(false)
      } catch (err) {
        console.error('Error stopping scanner:', err)
      }
    }
  }

  const requestPermission = async () => {
    setError(null)
    await initializeScanner()
  }

  return (
    <div className="space-y-4">
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <Card className="bg-red-500/20 border-red-500/30">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-red-400 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-red-300 text-sm">{error}</p>
                    {hasPermission === false && (
                      <Button
                        onClick={requestPermission}
                        size="sm"
                        className="mt-3 bg-red-500/30 text-red-200 hover:bg-red-500/40"
                      >
                        <Camera className="mr-2 h-4 w-4" />
                        Request Permission
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      <Card className="bg-white/10 backdrop-blur-md border-white/20">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Camera size={20} />
            QR Code Scanner
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div 
            id="qr-reader" 
            ref={scannerRef}
            className="rounded-lg overflow-hidden"
          />
          {!isScanning && !error && (
            <div className="text-center py-8">
              <Camera className="h-12 w-12 text-white/50 mx-auto mb-4" />
              <p className="text-white/70">Initializing scanner...</p>
            </div>
          )}
        </CardContent>
      </Card>

      {isScanning && (
        <div className="bg-green-500/20 border border-green-500/30 rounded-lg p-4">
          <div className="flex items-center gap-2 text-green-300">
            <CheckCircle className="h-5 w-5" />
            <span>Scanner active - Point camera at QR code</span>
          </div>
        </div>
      )}
    </div>
  )
}
