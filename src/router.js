import { createRouter, createWebHistory } from 'vue-router'
import { defineAsyncComponent } from 'vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'home',
      component: defineAsyncComponent(() => import('@/views/Home.vue'))
    }
  ]
})

export default router
