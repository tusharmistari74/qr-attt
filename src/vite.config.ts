import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const isAdmin = mode === 'admin';
  const isTeacher = mode === 'teacher';
  const isStudent = mode === 'student';

  return {
    plugins: [
      react()
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
      outDir: isAdmin ? 'dist-admin' : isTeacher ? 'dist-teacher' : isStudent ? 'dist-student' : 'dist',
      rollupOptions: {
        input: {
          main: isAdmin ? 'admin.html' : isTeacher ? 'teacher.html' : isStudent ? 'student.html' : 'index.html'
        }
      }
    }
  }
})