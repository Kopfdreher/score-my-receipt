import 'vuetify/styles'
import '@mdi/font/css/materialdesignicons.css'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import { aliases, mdi } from 'vuetify/iconsets/mdi'

export const vuetify = createVuetify({
  components,
  directives,
  icons: {
    defaultSet: 'mdi',
    aliases,
    sets: {
      mdi
    }
  },
  theme: {
    themes: {
      light: {
        colors: {
          primary: '#1F6B4A',
          secondary: '#C8E6C0',
          surface: '#F4F7F2',
          background: '#16382A',
          'on-primary': '#FFFFFF',
          'on-background': '#F4F7F2'
        }
      }
    }
  },
  defaults: {
    VBtn: {
      rounded: 'lg',
      style: 'text-transform: none; letter-spacing: 0;'
    }
  }
})
