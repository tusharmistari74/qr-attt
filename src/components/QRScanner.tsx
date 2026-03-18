import React, { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Camera, Scan, CheckCircle, ArrowLeft } from 'lucide-react';

interface QRScannerProps {
  onScan: (data: string) => void;
  availableQRCode: string | null;
  onBack?: () => void;
}

export function QRScanner({ onScan, availableQRCode, onBack }: QRScannerProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [scanComplete, setScanComplete] = useState(false);

  const handleStartScan = () => {
    setIsScanning(true);
    setScanComplete(false);
    
    // Simulate camera scanning
    setTimeout(() => {
      if (availableQRCode) {
        setScanComplete(true);
        setTimeout(() => {
          onScan(availableQRCode);
          setIsScanning(false);
          setScanComplete(false);
        }, 1000);
      } else {
        setIsScanning(false);
        alert('No QR code available. Please generate one from the admin panel first.');
      }
    }, 2000);
  };

  return (
    <div className="p-6">
      {/* Header with back button */}
      <div className="flex items-center justify-between mb-8">
        {onBack && (
          <Button
            onClick={onBack}
            className="bg-white/20 text-white hover:bg-white/30 rounded-lg p-2"
          >
            <ArrowLeft size={20} />
          </Button>
        )}
        <h1 className="text-center uppercase text-white flex-1">QR CODE SCANNER</h1>
        {onBack && <div className="w-10"></div>} {/* Spacer for centering */}
      </div>
      
      <Card className="bg-white/10 backdrop-blur-sm border-white/20">
        <CardContent className="p-6">
          {/* Camera Preview Area */}
          <div className="relative bg-black rounded-lg mb-6 overflow-hidden" style={{ aspectRatio: '4/3' }}>
            {isScanning ? (
              <div className="w-full h-full flex items-center justify-center relative">
                {/* Simulated camera feed */}
                <div className="absolute inset-0 bg-gradient-to-br from-gray-800 to-gray-900 opacity-80"></div>
                
                {/* Scanning overlay */}
                <div className="relative z-10 w-48 h-48 border-2 border-white rounded-lg flex items-center justify-center">
                  {scanComplete ? (
                    <CheckCircle size={48} className="text-green-400" />
                  ) : (
                    <>
                      <Scan size={48} className="text-white animate-pulse" />
                      {/* Scanning line animation */}
                      <div className="absolute top-0 left-0 right-0 h-0.5 bg-red-500 animate-pulse"></div>
                    </>
                  )}
                </div>
                
                {/* Corner markers */}
                <div className="absolute top-16 left-16 w-8 h-8 border-l-2 border-t-2 border-white"></div>
                <div className="absolute top-16 right-16 w-8 h-8 border-r-2 border-t-2 border-white"></div>
                <div className="absolute bottom-16 left-16 w-8 h-8 border-l-2 border-b-2 border-white"></div>
                <div className="absolute bottom-16 right-16 w-8 h-8 border-r-2 border-b-2 border-white"></div>
              </div>
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <div className="text-center text-white/70">
                  <Camera size={64} className="mx-auto mb-4 opacity-50" />
                  <p>Camera preview will appear here</p>
                  <p className="text-sm mt-2">Tap the button below to start scanning</p>
                </div>
              </div>
            )}
          </div>
          
          {/* Scan Button */}
          <Button
            onClick={handleStartScan}
            disabled={isScanning}
            className="w-full bg-[#D9D9D9] text-black hover:bg-[#C0C0C0] rounded-lg py-4 text-lg disabled:opacity-50"
          >
            {isScanning ? (
              scanComplete ? 'QR Code Detected!' : 'Scanning...'
            ) : (
              'START QR SCAN'
            )}
          </Button>
          
          {/* Instructions */}
          <div className="mt-6 text-center text-white/80 text-sm space-y-2">
            <p>• Point your camera at the QR code</p>
            <p>• Make sure the code is clearly visible</p>
            <p>• Hold steady until scan completes</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}