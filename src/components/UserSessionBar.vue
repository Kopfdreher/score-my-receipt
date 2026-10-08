<template>
  <nav class="session-bar" :aria-label="$t('nav.ariaLabel')">
    <p v-if="isSignedIn" class="session-bar__welcome">
      <span class="session-bar__welcome-label">{{ $t('auth.welcome') }}</span>
      <span class="session-bar__welcome-name">{{ appStore.user.username }}</span>
    </p>
    <router-link v-else class="session-bar__signin" to="/sign-in">
      {{ $t('signIn.title') }}
    </router-link>

    <v-menu v-if="isSignedIn" location="bottom end" :offset="6">
      <template #activator="{ props: menuProps }">
        <v-btn
          v-bind="menuProps"
          icon="mdi-menu"
          variant="text"
          class="session-bar__menu-btn"
          :aria-label="$t('nav.menu')"
        />
      </template>
      <v-list density="comfortable" class="session-bar__list" min-width="200">
        <v-list-item
          v-for="entry in menuEntries"
          :key="entry.to"
          :to="entry.to"
          :prepend-icon="entry.icon"
          :title="entry.title"
          :active="isRoute(entry.route)"
          color="primary"
        />
        <v-divider />
        <v-list-item
          prepend-icon="mdi-logout"
          :title="$t('auth.signOut')"
          @click="signOut"
        />
      </v-list>
    </v-menu>
  </nav>
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
    },
    menuEntries() {
      return [
        { to: '/upload', route: 'upload', icon: 'mdi-camera-outline', title: this.$t('nav.upload') },
        { to: '/history', route: 'history', icon: 'mdi-history', title: this.$t('history.nav') }
      ]
    }
  },
  methods: {
    isRoute(name) {
      return this.$route.name === name
    },
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
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  width: 100%;
  min-width: 0;
}

.session-bar__welcome {
  display: flex;
  flex-direction: column;
  min-width: 0;
  margin: 0;
  line-height: 1.2;
}

.session-bar__welcome-label {
  font-size: 0.72rem;
  color: rgba(232, 242, 230, 0.7);
}

.session-bar__welcome-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 1rem;
  font-weight: 700;
  color: #F7FBF4;
}

.session-bar__signin {
  color: #F7FBF4;
  font-weight: 600;
  text-decoration: none;
}

.session-bar__menu-btn {
  flex-shrink: 0;
  margin-right: -0.5rem;
  color: #F7FBF4 !important;
}
</style>
