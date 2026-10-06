import { createRouter, createWebHistory } from 'vue-router'
import { defineAsyncComponent } from 'vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'home',
      component: defineAsyncComponent(() => import('@/views/Home.vue'))
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
    }
  ]
})

export default router
