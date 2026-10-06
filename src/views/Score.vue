<template>
  <v-main>
    <v-container>
      <h1>{{ $t('score.title') }}</h1>
      <p>{{ $t('score.teamNote') }}</p>
      <v-btn class="mt-4" @click="goBack">
        {{ $t('score.back') }}
      </v-btn>
    </v-container>
  </v-main>
</template>

<script>
import { useAppStore } from '@/store'

export default {
  name: 'Score',
  mounted() {
    this.ensureReceipt()
  },
  methods: {
    ensureReceipt() {
      const store = useAppStore()
      if (this.$route.query.mock === '1' || store.getItems.length === 0) {
        store.loadMockReceipt()
      }
    },
    goBack() {
      this.$router.push({ name: 'review' })
    }
  }
}
</script>
