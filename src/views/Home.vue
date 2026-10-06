<template>
  <v-main>
    <v-container>
      <h1>{{ $t('capture.title') }}</h1>
      <p>{{ $t('capture.teamNote') }}</p>
      <v-btn color="primary" class="mt-4" @click="goNext">
        {{ $t('capture.next') }}
      </v-btn>
    </v-container>
  </v-main>
</template>

<script>
export default {
  name: 'Home',
  methods: {
    goNext() {
      this.$router.push({ name: 'review' })
    }
  }
}
</script>
