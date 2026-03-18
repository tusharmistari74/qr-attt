import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig(({ mode }) => {
  const isAdmin = mode === 'admin';
  const isTeacher = mode === 'teacher';
  const isStudent = mode === 'student';
  const isMobile = mode === 'mobile';

  return {
    plugins: [
      react(),
      ...(isMobile ? [
        VitePWA({
          registerType: 'autoUpdate',
          workbox: {
            globPatterns: ['**/*.{js,css,html,ico,png,svg}']
          },
          manifest: {
            name: 'Student Attendance App',
            short_name: 'Attendance',
            description: 'Secure student attendance management with OTP authentication',
            theme_color: '#2B0230',
            background_color: '#3B0A45',
            display: 'standalone',
            orientation: 'portrait',
            scope: '/',
            start_url: '/',
            icons: [
              {
                src: 'icon-192.png',
                sizes: '192x192',
                type: 'image/png'
              },
              {
                src: 'icon-512.png',
                sizes: '512x512',
                type: 'image/png'
              }
            ]
          }
        })
      ] : [])
    ],
    define: {
      __APP_MODE__: JSON.stringify(mode),
    },
    server: {
      proxy: {
        '/api': {
          target: 'http://localhost:3003',
          changeOrigin: true,
          secure: false,
        }
      }
    },
    build: {
      outDir: isAdmin ? 'dist-admin' : isTeacher ? 'dist-teacher' : isStudent ? 'dist-student' : isMobile ? 'dist-mobile' : 'dist',
      rollupOptions: {
        input: {
          main: isAdmin ? 'admin.html' : isTeacher ? 'teacher.html' : isStudent ? 'student.html' : isMobile ? 'mobile.html' : 'index.html'
        }
      }
    }
  }
})