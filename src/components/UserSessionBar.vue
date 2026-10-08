<template>
  <nav class="session-bar" :aria-label="$t('nav.ariaLabel')">
    <div class="session-bar__identity">
      <p class="session-bar__brand">
        {{ $t('app.name') }}
      </p>
      <router-link v-if="!isSignedIn" class="session-bar__signin" to="/sign-in">
        {{ $t('signIn.title') }}
      </router-link>
    </div>

    <button
      v-if="isSignedIn"
      type="button"
      class="session-bar__menu-btn"
      :aria-label="accountMenuOpen ? $t('nav.closeAccount') : $t('nav.account')"
      :aria-expanded="accountMenuOpen ? 'true' : 'false'"
      @click="accountMenuOpen = !accountMenuOpen"
    >
      <v-icon :icon="accountMenuOpen ? 'mdi-close' : 'mdi-account-circle-outline'" size="26" />
    </button>
    <router-link
      v-else
      class="session-bar__menu-btn"
      to="/sign-in"
      :aria-label="$t('nav.account')"
    >
      <v-icon icon="mdi-account-circle-outline" size="26" />
    </router-link>

    <Teleport to="body">
      <div v-if="accountMenuOpen" class="session-bar__screen">
        <div class="session-bar__screen-header">
          <p class="session-bar__brand">
            {{ $t('app.name') }}
          </p>
          <button
            type="button"
            class="session-bar__menu-btn"
            :aria-label="$t('nav.closeAccount')"
            @click="accountMenuOpen = false"
          >
            <v-icon icon="mdi-close" size="26" />
          </button>
        </div>
        <nav class="session-bar__screen-nav" :aria-label="$t('nav.account')">
          <router-link
            v-for="entry in menuEntries"
            :key="entry.to"
            :to="entry.to"
            class="session-bar__screen-link"
            :class="{ 'session-bar__screen-link--active': isRoute(entry.route) }"
            @click="accountMenuOpen = false"
          >
            <v-icon :icon="entry.icon" size="22" />
            <span>{{ entry.title }}</span>
          </router-link>
          <button type="button" class="session-bar__screen-link" @click="signOut">
            <v-icon icon="mdi-logout" size="22" />
            <span>{{ $t('auth.signOut') }}</span>
          </button>
        </nav>
      </div>
    </Teleport>
  </nav>
</template>

<script>
import { mapStores } from 'pinia'
import { useAppStore } from '@/store'

export default {
  name: 'UserSessionBar',
  data() {
    return {
      accountMenuOpen: false
    }
  },
  computed: {
    ...mapStores(useAppStore),
    isSignedIn() {
      return Boolean(this.appStore.user.token)
    },
    menuEntries() {
      return [
        { to: '/history', route: 'history', icon: 'mdi-history', title: this.$t('history.nav') }
      ]
    }
  },
  watch: {
    '$route.fullPath'() {
      this.accountMenuOpen = false
    }
  },
  methods: {
    isRoute(name) {
      return this.$route.name === name
    },
    signOut() {
      this.accountMenuOpen = false
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

.session-bar__identity {
  display: flex;
  flex-direction: column;
  min-width: 0;
  gap: 0.1rem;
}

.session-bar__brand {
  margin: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 0.95rem;
  font-weight: 700;
  line-height: 1.2;
  color: #F7FBF4;
}

.session-bar__signin {
  color: #F7FBF4;
  font-weight: 600;
  text-decoration: none;
}

.session-bar__menu-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 2.75rem;
  height: 2.75rem;
  margin: 0;
  padding: 0;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: #F7FBF4;
  text-decoration: none;
  cursor: pointer;
}

.session-bar__screen {
  position: fixed;
  z-index: 80;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  display: flex;
  flex-direction: column;
  padding: var(--safe-top, 0px) 1.15rem var(--safe-bottom, 0px);
  background: #16382A;
  box-sizing: border-box;
}

.session-bar__screen-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  flex: 0 0 auto;
  min-height: 4.45rem;
  padding: 0.85rem 0;
  border-bottom: 1px solid rgba(232, 242, 230, 0.16);
}

.session-bar__screen-nav {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.session-bar__screen-link {
  display: flex;
  align-items: center;
  gap: 0.85rem;
  width: 100%;
  min-height: 3.25rem;
  padding: 0.7rem 0.35rem;
  border: 0;
  background: transparent;
  color: #F7FBF4;
  font: inherit;
  font-size: 1.15rem;
  font-weight: 650;
  text-align: left;
  text-decoration: none;
  cursor: pointer;
}

.session-bar__screen-link--active {
  color: #F7FBF4;
}
</style>
