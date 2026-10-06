import { createRouter, createWebHistory } from 'vue-router'
import { useAppStore } from '@/store'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'home',
      redirect: () => {
        const store = useAppStore()
        return store.user.token ? '/upload' : '/sign-in'
      }
    },
    {
      path: '/sign-in',
      name: 'sign-in',
      component: () => import('@/views/SignIn.vue'),
      meta: { requiresAnonymous: true }
    },
    {
      path: '/upload',
      name: 'upload',
      component: () => import('@/views/Upload.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/history',
      name: 'history',
      component: () => import('@/views/History.vue'),
      meta: { requiresAuth: true }
    }
  ]
})

router.beforeEach((to) => {
  const store = useAppStore()
  const signedIn = Boolean(store.user.token)

  if (to.meta.requiresAuth && !signedIn) {
    return {
      name: 'sign-in',
      query: { next: to.fullPath }
    }
  }

  if (to.meta.requiresAnonymous && signedIn) {
    return { name: 'upload' }
  }

  return true
})

export default router
