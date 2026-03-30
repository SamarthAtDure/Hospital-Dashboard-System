import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path' // needed for resolve.alias

export default defineConfig({
  plugins: [
    react({
      babel: {
        plugins: ['babel-plugin-react-compiler'],
      },
    }),
    tailwindcss(),
  ],

  // base: sets the public base path for the app
  base: './',

  //alias: simplify imports by defining path aliases (e.g. '@' for 'src')
  //resolve options control how modules are resolved. Here we set up an alias so that '@' maps to the 'src' directory, allowing for cleaner import statements in our code.
  resolve: {
    alias: {
      '@':            path.resolve(__dirname, 'src'),
      '@components':  path.resolve(__dirname, 'src/components'),
      '@pages':       path.resolve(__dirname, 'src/pages'),
      '@context':     path.resolve(__dirname, 'src/context'),
      '@store':        path.resolve(__dirname, 'src/store'),
      '@data':        path.resolve(__dirname, 'src/data'),
      '@charts':      path.resolve(__dirname, 'src/components/charts'),
    },
  },

  // // server: options for the local dev server (vite dev)
  // server: {
  //   port: 3000,          // default is 5173
  //   // open: true,       // auto-open browser on start
  //   // host: true,       // expose to local network (0.0.0.0)
  //   // proxy: {          // proxy API calls to avoid CORS in dev
  //   //   '/api': 'http://localhost:8080',
  //   // },
  // },

  // preview: options for `vite preview` (serves the production build locally)
  // preview: {
  //   // port: 4173,       // default preview port
  // },


  // define: global compile-time constants (replaced at build time)
  // define: { __APP_VERSION__: JSON.stringify('1.0.0') },

  // envPrefix: which env variable prefixes are exposed to client code
  // default is 'VITE_', so VITE_API_URL is accessible as import.meta.env.VITE_API_URL
  // envPrefix: 'VITE_',

  // optimizeDeps: controls Vite's pre-bundling of dependencies
  // optimizeDeps: {
  //   include: ['lodash-es'], // force pre-bundle a dep
  //   exclude: ['some-pkg'], // skip pre-bundling
  // },
})
