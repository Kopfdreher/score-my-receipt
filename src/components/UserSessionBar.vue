<template>
  <div class="session-bar">
    <template v-if="isSignedIn">
      <span class="session-bar__user">
        {{ $t('auth.signedInAs', { username: appStore.user.username }) }}
      </span>
      <button
        type="button"
        class="session-bar__action"
        @click="signOut"
      >
        {{ $t('auth.signOut') }}
      </button>
    </template>
    <router-link
      v-else
      class="session-bar__action"
      to="/sign-in"
    >
      {{ $t('signIn.title') }}
    </router-link>
  </div>
</template>

<script>
import { mapStores } from 'pinia'
import { useAppStore } from '@/store'

export default {
  name: 'UserSessionBar',
  computed: {
    ...mapStores(useAppStore),
    isSignedIn() {
      return Boolean(this.appStore.user.token)
    }
  },
  methods: {
    signOut() {
      this.appStore.signOut()
      this.$router.push('/sign-in')
    }
  }
}
</script>

<style scoped>
.session-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.75rem 1rem;
}

.session-bar__user {
  color: rgba(247, 251, 244, 0.78);
  font-size: 0.95rem;
}

.session-bar__action {
  appearance: none;
  background: none;
  border: 0;
  padding: 0;
  margin: 0;
  font: inherit;
  font-weight: 500;
  color: var(--smr-mist, #E8F2E6);
  text-decoration: none;
  border-bottom: 1px solid rgba(232, 242, 230, 0.45);
  cursor: pointer;
}

.session-bar__action:hover,
.session-bar__action:focus-visible {
  color: #fff;
  border-color: #fff;
  outline: none;
}
</style>
