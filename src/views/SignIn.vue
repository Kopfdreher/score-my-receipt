<template>
  <main class="sign-in">
    <div class="sign-in__media" aria-hidden="true">
      <div class="sign-in__image" />
      <div class="sign-in__veil" />
    </div>

    <div class="sign-in__layout">
      <section class="sign-in__intro sign-in__reveal sign-in__reveal--1">
        <p class="sign-in__eyebrow">
          {{ $t('signIn.eyebrow') }}
        </p>
        <h1 class="sign-in__brand">
          {{ $t('app.name') }}
        </h1>
        <p class="sign-in__tagline">
          {{ $t('signIn.tagline') }}
        </p>
        <p class="sign-in__detail">
          {{ $t('signIn.detail') }}
        </p>
      </section>

      <section class="sign-in__auth sign-in__reveal sign-in__reveal--2">
        <div class="sign-in__card">
          <h2 class="sign-in__title">
            {{ $t('signIn.title') }}
          </h2>
          <p class="sign-in__support">
            {{ $t('signIn.support') }}
          </p>

          <v-alert
            v-if="errorMessage"
            class="mb-5"
            type="error"
            variant="tonal"
            density="comfortable"
            role="alert"
            :text="errorMessage"
          />

          <v-form class="sign-in__form" @submit.prevent="submit">
            <label class="sign-in__label" for="sign-in-username">
              {{ $t('signIn.username') }}
            </label>
            <v-text-field
              id="sign-in-username"
              ref="usernameField"
              v-model="username"
              autocomplete="username"
              variant="outlined"
              density="comfortable"
              hide-details="auto"
              color="primary"
              base-color="#9BB5A8"
              bg-color="#FFFFFF"
              class="sign-in__field"
              :disabled="loading"
              :placeholder="$t('signIn.usernamePlaceholder')"
              required
            />
            <p class="sign-in__hint">
              {{ $t('signIn.usernameHint') }}
            </p>

            <label class="sign-in__label" for="sign-in-password">
              {{ $t('signIn.password') }}
            </label>
            <v-text-field
              id="sign-in-password"
              v-model="password"
              :type="showPassword ? 'text' : 'password'"
              autocomplete="current-password"
              variant="outlined"
              density="comfortable"
              hide-details="auto"
              color="primary"
              base-color="#9BB5A8"
              bg-color="#FFFFFF"
              class="sign-in__field sign-in__field--password"
              :disabled="loading"
              :placeholder="$t('signIn.passwordPlaceholder')"
              :append-inner-icon="showPassword ? 'mdi-eye-off-outline' : 'mdi-eye-outline'"
              required
              @click:append-inner="showPassword = !showPassword"
            />

            <v-btn
              type="submit"
              color="primary"
              size="large"
              block
              height="50"
              class="sign-in__submit"
              :loading="loading"
              :disabled="!canSubmit"
            >
              {{ $t('signIn.submit') }}
            </v-btn>
          </v-form>

          <p class="sign-in__footer">
            {{ $t('signIn.noAccount') }}
            <a
              :href="OFF_SIGN_UP_URL"
              target="_blank"
              rel="noopener noreferrer"
            >
              {{ $t('signIn.createAccount') }}
            </a>
          </p>
        </div>
      </section>
    </div>
  </main>
</template>

<script>
import { mapStores } from 'pinia'
import { useAppStore } from '@/store'
import openPricesApi, { OpenPricesApiError } from '@/services/openPricesApi'
import constants from '@/constants'

export default {
  name: 'SignIn',
  data() {
    return {
      username: '',
      password: '',
      showPassword: false,
      loading: false,
      errorMessage: null,
      OFF_SIGN_UP_URL: constants.OFF_SIGN_UP_URL
    }
  },
  computed: {
    ...mapStores(useAppStore),
    canSubmit() {
      return Boolean(this.username.trim() && this.password && !this.loading)
    },
    nextPath() {
      const next = this.$route.query.next
      if (typeof next === 'string' && next.startsWith('/') && !next.startsWith('//')) {
        return next
      }
      return '/upload'
    }
  },
  mounted() {
    if (this.appStore.user.token) {
      this.$router.replace(this.nextPath)
      return
    }

    this.$nextTick(() => {
      const field = this.$refs.usernameField
      if (field && typeof field.focus === 'function') {
        field.focus()
      }
    })
  },
  methods: {
    submit() {
      if (!this.canSubmit) return

      this.loading = true
      this.errorMessage = null

      openPricesApi.signIn(this.username.trim(), this.password)
        .then((data) => {
          this.appStore.signIn(data)
          this.password = ''
          return this.$router.replace(this.nextPath)
        })
        .catch((error) => {
          if (error instanceof OpenPricesApiError) {
            this.errorMessage = error.message || this.$t('signIn.errors.generic')
          } else {
            this.errorMessage = this.$t('signIn.errors.network')
          }
        })
        .finally(() => {
          this.loading = false
        })
    }
  }
}
</script>

<style scoped>
.sign-in {
  position: relative;
  min-height: 100dvh;
  overflow: hidden;
  color: var(--smr-cream, #F7FBF4);
  background: #0E241C;
}

.sign-in__media {
  position: absolute;
  inset: 0;
  z-index: 0;
}

.sign-in__image {
  position: absolute;
  inset: -4%;
  background-image: url('https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=2200&q=80');
  background-size: cover;
  background-position: center;
  animation: sign-in-drift 24s ease-in-out infinite alternate;
}

.sign-in__veil {
  position: absolute;
  inset: 0;
  background:
    linear-gradient(105deg, rgba(10, 28, 22, 0.78) 0%, rgba(10, 28, 22, 0.45) 48%, rgba(10, 28, 22, 0.55) 100%),
    linear-gradient(180deg, rgba(10, 28, 22, 0.2) 0%, rgba(10, 28, 22, 0.55) 100%);
}

.sign-in__layout {
  position: relative;
  z-index: 1;
  min-height: 100dvh;
  display: grid;
  grid-template-columns: 1fr;
  align-content: center;
  gap: 1.75rem;
  width: min(1120px, 100%);
  margin: 0 auto;
  padding: clamp(1.5rem, 4vw, 3rem);
}

.sign-in__intro {
  width: min(28rem, 100%);
}

.sign-in__eyebrow {
  margin: 0 0 0.65rem;
  font-size: 0.72rem;
  font-weight: 500;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: rgba(232, 242, 230, 0.72);
}

.sign-in__brand {
  margin: 0 0 0.75rem;
  font-family: var(--font-display, Georgia, serif);
  font-size: clamp(1.85rem, 4vw, 2.35rem);
  font-weight: 600;
  line-height: 1.15;
  letter-spacing: -0.02em;
}

.sign-in__tagline {
  margin: 0 0 0.75rem;
  max-width: 28ch;
  font-size: 1.02rem;
  line-height: 1.45;
  color: rgba(247, 251, 244, 0.9);
}

.sign-in__detail {
  margin: 0;
  max-width: 34ch;
  font-size: 0.9rem;
  line-height: 1.55;
  color: rgba(247, 251, 244, 0.7);
}

.sign-in__auth {
  display: flex;
  align-items: center;
  justify-content: flex-start;
}

.sign-in__card {
  width: min(23rem, 100%);
  padding: 1.6rem 1.45rem 1.45rem;
  border-radius: 1.15rem;
  background: rgba(247, 251, 244, 0.96);
  color: #0E241C;
  backdrop-filter: blur(12px);
  box-shadow: 0 22px 48px rgba(6, 18, 13, 0.35);
  border: 1px solid rgba(255, 255, 255, 0.35);
}

.sign-in__title {
  margin: 0 0 0.4rem;
  font-family: var(--font-body, system-ui, sans-serif);
  font-size: 1.2rem;
  font-weight: 600;
  color: #0E241C;
}

.sign-in__support {
  margin: 0 0 1.4rem;
  color: rgba(14, 36, 28, 0.68);
  font-size: 0.9rem;
  line-height: 1.5;
}

.sign-in__label {
  display: block;
  margin: 0 0 0.4rem;
  font-size: 0.86rem;
  font-weight: 600;
  color: #16382A;
}

.sign-in__hint {
  margin: 0.4rem 0 1.1rem;
  font-size: 0.8rem;
  line-height: 1.4;
  color: rgba(14, 36, 28, 0.58);
}

.sign-in__field--password {
  margin-bottom: 1.4rem;
}

.sign-in__field :deep(.v-field) {
  --v-field-padding-start: 14px;
  --v-field-padding-end: 14px;
  border-radius: 0.65rem;
  font-size: 0.98rem;
}

.sign-in__field :deep(.v-field__input) {
  min-height: 48px;
  padding-top: 10px;
  padding-bottom: 10px;
  color: #0E241C;
}

.sign-in__field :deep(input) {
  color: #0E241C;
}

.sign-in__field :deep(input::placeholder) {
  color: rgba(14, 36, 28, 0.4);
  opacity: 1;
}

.sign-in__submit {
  font-weight: 600;
  letter-spacing: 0;
}

.sign-in__footer {
  margin: 1.25rem 0 0;
  color: rgba(14, 36, 28, 0.68);
  font-size: 0.9rem;
  line-height: 1.5;
}

.sign-in__footer a {
  color: #1F6B4A;
  font-weight: 600;
  text-decoration: none;
  border-bottom: 1px solid rgba(31, 107, 74, 0.3);
}

.sign-in__footer a:hover,
.sign-in__footer a:focus-visible {
  border-color: #1F6B4A;
  outline: none;
}

.sign-in__reveal {
  opacity: 0;
  transform: translateY(16px);
  animation: sign-in-rise 0.75s ease forwards;
}

.sign-in__reveal--1 {
  animation-delay: 0.05s;
}

.sign-in__reveal--2 {
  animation-delay: 0.18s;
}

@keyframes sign-in-rise {
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes sign-in-drift {
  from {
    transform: scale(1.03) translate3d(0, 0, 0);
  }
  to {
    transform: scale(1.08) translate3d(-1.2%, -0.8%, 0);
  }
}

@media (min-width: 960px) {
  .sign-in__layout {
    grid-template-columns: 1fr auto;
    align-items: center;
    gap: 3rem;
    padding: clamp(3rem, 6vw, 5rem);
  }

  .sign-in__auth {
    justify-content: flex-end;
  }

  .sign-in__card {
    width: 23rem;
    padding: 1.85rem 1.7rem 1.6rem;
  }

  .sign-in__brand {
    font-size: 2.35rem;
  }

  .sign-in__tagline {
    font-size: 1.08rem;
  }
}

@media (prefers-reduced-motion: reduce) {
  .sign-in__image,
  .sign-in__reveal {
    animation: none;
  }

  .sign-in__reveal {
    opacity: 1;
    transform: none;
  }
}
</style>
