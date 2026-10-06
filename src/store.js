import { defineStore } from 'pinia'

export const useAppStore = defineStore('app', {
  state: () => ({
    user: {
      username: null,
      token: null
    }
  }),
  actions: {
    signIn(data) {
      this.user.username = data['user_id']
      this.user.token = data['access_token']
    },
    signOut() {
      this.user.username = null
      this.user.token = null
    }
  },
  persist: {
    storage: localStorage
  }
})
