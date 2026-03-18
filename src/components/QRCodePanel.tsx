import React from 'react';
import { Card, CardContent } from './ui/card';
import { QrCode } from 'lucide-react';

interface QRCodePanelProps {
  qrCode: string | null;
}

export function QRCodePanel({ qrCode }: QRCodePanelProps) {
  // Generate a simple QR code representation using CSS
  const generateQRPattern = () => {
    const pattern = [];
    for (let i = 0; i < 25; i++) {
      const row = [];
      for (let j = 0; j < 25; j++) {
        // Create a pseudo-random pattern based on the QR code data
        const seed = qrCode ? qrCode.length + i + j : i + j;
        const isBlack = seed % 3 === 0;
        row.push(isBlack);
      }
      pattern.push(row);
    }
    return pattern;
  };

  if (!qrCode) {
    return (
      <div className="mt-6 text-center">
        <div className="bg-white/10 rounded-lg p-8 flex flex-col items-center justify-center h-64">
          <QrCode size={48} className="text-white/50 mb-4" />
          <p className="text-white/70">QR Code will appear here</p>
        </div>
      </div>
    );
  }

  const pattern = generateQRPattern();

  return (
    <Card className="mt-6 bg-white border-0">
      <CardContent className="p-6">
        <div className="text-center space-y-4">
          <h3 className="text-black">Generated QR Code</h3>
          
          {/* QR Code Visual */}
          <div className="mx-auto w-48 h-48 bg-white p-4 rounded-lg">
            <div className="w-full h-full grid grid-cols-25 gap-px bg-gray-200">
              {pattern.map((row, i) =>
                row.map((isBlack, j) => (
                  <div
                    key={`${i}-${j}`}
                    className={`${isBlack ? 'bg-black' : 'bg-white'}`}
                    style={{ aspectRatio: '1/1' }}
                  />
                ))
              )}
            </div>
          </div>
          
          {/* QR Code Data */}
          <div className="bg-gray-100 rounded-md p-3">
            <p className="text-xs text-gray-600 break-all">
              {qrCode}
            </p>
          </div>
          
          <p className="text-sm text-gray-600">
            Scan this QR code with the mobile app to mark attendance
          </p>
        </div>
      </CardContent>
    </Card>
  );
}