<template>
  <v-main>
    <v-container>
      <h1>{{ $t('review.title') }}</h1>
      <p>{{ $t('review.teamNote') }}</p>
      <div class="mt-4">
        <v-btn class="mr-2" @click="goBack">
          {{ $t('review.back') }}
        </v-btn>
        <v-btn color="primary" @click="goNext">
          {{ $t('review.next') }}
        </v-btn>
      </div>
    </v-container>
  </v-main>
</template>

<script>
import { useAppStore } from '@/store'

export default {
  name: 'Review',
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
      this.$router.push({ name: 'upload' })
    },
    goNext() {
      this.$router.push({ name: 'score' })
    }
  }
}
</script>
