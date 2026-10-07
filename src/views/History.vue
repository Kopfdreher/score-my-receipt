<template>
  <main class="history">
    <header class="history__header">
      <div>
        <p class="history__brand">
          {{ $t('app.name') }}
        </p>
        <h1 class="history__title">
          {{ $t('history.title') }}
        </h1>
        <p class="history__subtitle">
          {{ $t('history.subtitle') }}
        </p>
      </div>
    </header>

    <section class="history__panel">
      <div class="history__filters">
        <v-btn-toggle
          v-model="statusFilter"
          mandatory
          density="comfortable"
          color="primary"
          class="history__status-toggle"
        >
          <v-btn value="all" size="small">
            {{ $t('history.filterAll') }}
          </v-btn>
          <v-btn value="draft" size="small">
            {{ $t('history.filterDraft') }}
          </v-btn>
          <v-btn value="scored" size="small">
            {{ $t('history.filterScored') }}
          </v-btn>
        </v-btn-toggle>

        <v-text-field
          v-model="searchQuery"
          :label="$t('history.search')"
          :placeholder="$t('history.searchPlaceholder')"
          prepend-inner-icon="mdi-magnify"
          variant="outlined"
          density="compact"
          clearable
          hide-details
          class="history__search"
        />
      </div>

      <v-alert
        v-if="message"
        class="mb-3"
        :type="messageType"
        variant="tonal"
        density="compact"
        :text="message"
      />

      <div v-if="loading" class="history__empty">
        <v-progress-circular indeterminate color="primary" size="28" />
        <p>{{ $t('history.loading') }}</p>
      </div>

      <div v-else-if="!filteredEntries.length" class="history__empty">
        <p>{{ $t('history.empty') }}</p>
        <v-btn color="primary" variant="tonal" size="small" :to="{ name: 'upload' }">
          {{ $t('history.goCapture') }}
        </v-btn>
      </div>

      <ul v-else class="history__list">
        <li
          v-for="entry in filteredEntries"
          :key="entry.id"
          class="history__card"
        >
          <div class="history__card-main">
            <div class="history__card-top">
              <v-chip
                size="small"
                variant="tonal"
                :color="entry.status === 'draft' ? 'warning' : 'success'"
              >
                {{ entry.status === 'draft' ? $t('history.statusDraft') : $t('history.statusScored') }}
              </v-chip>
              <span class="history__card-date">
                {{ formatWhen(entry.updatedAt) }}
              </span>
            </div>
            <h2 class="history__card-title">
              {{ entryTitle(entry) }}
            </h2>
            <p class="history__card-meta">
              {{ $t('history.cardMeta', {
                count: entry.itemCount,
                currency: entry.currency || '—',
                date: entry.date || $t('history.noReceiptDate')
              }) }}
            </p>
          </div>
          <div class="history__card-actions">
            <v-btn
              color="primary"
              size="small"
              variant="flat"
              :loading="openingId === entry.id"
              @click="openEntry(entry)"
            >
              {{ entry.status === 'draft' ? $t('history.openDraft') : $t('history.openScored') }}
            </v-btn>
            <v-btn
              color="error"
              size="small"
              variant="text"
              :loading="deletingId === entry.id"
              @click="removeEntry(entry.id)"
            >
              {{ $t('history.delete') }}
            </v-btn>
          </div>
        </li>
      </ul>
    </section>

    <footer class="history__footer">
      <v-btn variant="text" class="history__back" :to="{ name: 'upload' }">
        {{ $t('history.back') }}
      </v-btn>
      <v-btn color="primary" variant="tonal" :to="{ name: 'review' }">
        {{ $t('history.goReview') }}
      </v-btn>
    </footer>
  </main>
</template>

<script>
import { mapStores } from 'pinia'
import { useAppStore } from '@/store'

export default {
  name: 'History',
  data() {
    return {
      loading: true,
      statusFilter: 'all',
      searchQuery: '',
      message: null,
      messageType: 'info',
      openingId: null,
      deletingId: null
    }
  },
  computed: {
    ...mapStores(useAppStore),
    filteredEntries() {
      const query = String(this.searchQuery || '').trim().toLowerCase()
      return this.appStore.getHistorySummaries.filter((entry) => {
        if (this.statusFilter !== 'all' && entry.status !== this.statusFilter) {
          return false
        }
        if (!query) return true
        const haystack = [
          entry.locationName,
          entry.date,
          entry.currency,
          entry.status,
          entry.proofId
        ].filter(Boolean).join(' ').toLowerCase()
        return haystack.includes(query)
      })
    }
  },
  mounted() {
    this.loadHistory()
  },
  methods: {
    loadHistory() {
      this.loading = true
      this.message = null
      this.appStore.refreshHistorySummaries()
        .then(() => {
          this.loading = false
        })
        .catch(() => {
          this.loading = false
          this.messageType = 'error'
          this.message = this.$t('history.loadError')
        })
    },
    entryTitle(entry) {
      if (entry.locationName) return entry.locationName
      if (entry.date) return this.$t('history.untitledDated', { date: entry.date })
      return this.$t('history.untitled')
    },
    formatWhen(value) {
      if (!value) return '—'
      const date = new Date(value)
      if (Number.isNaN(date.getTime())) return value
      return new Intl.DateTimeFormat(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short'
      }).format(date)
    },
    openEntry(entry) {
      this.openingId = entry.id
      this.message = null
      this.appStore.loadReceiptFromHistory(entry.id)
        .then(() => {
          this.openingId = null
          if (entry.status === 'scored') {
            this.$router.push({ name: 'score' })
            return
          }
          this.$router.push({ name: 'review' })
        })
        .catch(() => {
          this.openingId = null
          this.messageType = 'error'
          this.message = this.$t('history.openError')
        })
    },
    removeEntry(id) {
      this.deletingId = id
      this.appStore.deleteReceiptHistory(id)
        .then(() => {
          this.deletingId = null
          this.messageType = 'success'
          this.message = this.$t('history.deleted')
        })
        .catch(() => {
          this.deletingId = null
          this.messageType = 'error'
          this.message = this.$t('history.deleteError')
        })
    }
  }
}
</script>

<style scoped>
.history {
  min-height: 100dvh;
  padding: 1.25rem;
  padding-bottom: 5rem;
  color: var(--smr-cream, #F7FBF4);
  background: linear-gradient(160deg, #16382A 0%, #0E241C 100%);
}

.history__header {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 0.75rem;
  margin-bottom: 1rem;
  width: min(56rem, 100%);
}

@media (min-width: 600px) {
  .history__header {
    flex-direction: row;
    align-items: flex-start;
    justify-content: space-between;
    gap: 1rem;
  }
}

.history__brand {
  margin: 0 0 0.2rem;
  font-family: var(--font-display, Georgia, serif);
  font-size: 1rem;
  font-weight: 700;
}

.history__title {
  margin: 0;
  font-size: 1.35rem;
  font-weight: 600;
}

.history__subtitle {
  margin: 0.35rem 0 0;
  max-width: 36rem;
  font-size: 0.9rem;
  line-height: 1.4;
  color: rgba(247, 251, 244, 0.72);
}

.history__panel {
  width: min(56rem, 100%);
  padding: 0.85rem;
  border-radius: 0.75rem;
  background: #F7FBF4;
  color: #0E241C;
  box-shadow: 0 14px 30px rgba(6, 18, 13, 0.22);
}

.history__filters {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  align-items: center;
  margin-bottom: 0.85rem;
}

.history__search {
  flex: 1;
  min-width: 12rem;
}

.history__search :deep(.v-field) {
  border-radius: 0.55rem;
  background: #fff;
}

.history__list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
}

.history__card {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.75rem 0.85rem;
  border-radius: 0.65rem;
  background: rgba(14, 36, 28, 0.04);
  border: 1px solid rgba(14, 36, 28, 0.08);
}

.history__card-main {
  flex: 1;
  min-width: 12rem;
}

.history__card-top {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem 0.75rem;
  margin-bottom: 0.25rem;
}

.history__card-date {
  font-size: 0.75rem;
  color: rgba(14, 36, 28, 0.55);
}

.history__card-title {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  color: #0E241C;
}

.history__card-meta {
  margin: 0.2rem 0 0;
  font-size: 0.8rem;
  color: rgba(14, 36, 28, 0.62);
}

.history__card-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
}

.history__empty {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 1.25rem 0.35rem;
  color: rgba(14, 36, 28, 0.7);
}

.history__empty p {
  margin: 0;
}

.history__footer {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  width: min(56rem, 100%);
  margin-top: 1rem;
}

.history__back {
  color: var(--smr-mist, #E8F2E6) !important;
}
</style>
