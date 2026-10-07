import { defineAsyncComponent } from 'vue'
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
      component: defineAsyncComponent(() => import('@/views/SignIn.vue')),
      meta: { requiresAnonymous: true }
    },
    {
      path: '/upload',
      name: 'upload',
      component: defineAsyncComponent(() => import('@/views/Upload.vue')),
      meta: { requiresAuth: true }
    },
    {
      path: '/review',
      name: 'review',
      component: defineAsyncComponent(() => import('@/views/Review.vue'))
    },
    {
      path: '/score',
      name: 'score',
      component: defineAsyncComponent(() => import('@/views/Score.vue'))
    },
    {
      path: '/history',
      name: 'history',
      component: defineAsyncComponent(() => import('@/views/History.vue'))
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
