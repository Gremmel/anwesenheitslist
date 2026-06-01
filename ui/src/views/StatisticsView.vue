<template>
  <main class="container mt-4">
    <h2 class="mb-3">
      <i class="bi bi-bar-chart-line"></i> Statistik
    </h2>

    <!-- Zeitraum-Auswahl -->
    <div class="card mb-4">
      <div class="card-body">
        <div class="row g-2 align-items-end">
          <div class="col-12 col-md-3">
            <label class="form-label mb-0">Von</label>
            <input type="date" class="form-control" v-model="from" />
          </div>
          <div class="col-12 col-md-3">
            <label class="form-label mb-0">Bis</label>
            <input type="date" class="form-control" v-model="to" />
          </div>
          <div class="col-12 col-md-6 d-flex flex-wrap gap-2">
            <button class="btn btn-primary" @click="loadStatistics" :disabled="loading">
              <span v-if="loading" class="spinner-border spinner-border-sm me-1"></span>
              <i v-else class="bi bi-arrow-clockwise"></i>
              Aktualisieren
            </button>
            <button class="btn btn-outline-secondary" @click="setYear(currentYear)">
              Aktuelles Jahr
            </button>
            <button class="btn btn-outline-secondary" @click="setYear(currentYear - 1)">
              Vorjahr
            </button>
            <button class="btn btn-outline-secondary" @click="setLastMonths(12)">
              Letzte 12 Monate
            </button>
          </div>
          <div class="col-12">
            <div class="form-check">
              <input
                id="onlyPastEvents"
                class="form-check-input"
                type="checkbox"
                v-model="onlyPast"
                @change="loadStatistics"
              />
              <label class="form-check-label" for="onlyPastEvents">
                Nur vergangene Events (Bis-Datum max. heute)
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="errorMessage" class="alert alert-danger">{{ errorMessage }}</div>

    <!-- Übersicht -->
    <div v-if="statistics" class="row g-3 mb-4">
      <div class="col-6 col-md-3">
        <div class="card text-bg-primary h-100">
          <div class="card-body text-center">
            <div class="display-6">{{ statistics.summary.eventCount }}</div>
            <div>Events</div>
          </div>
        </div>
      </div>
      <div class="col-6 col-md-3">
        <div class="card text-bg-success h-100">
          <div class="card-body text-center">
            <div class="display-6">{{ statistics.summary.zusagen }}</div>
            <div>Zusagen</div>
          </div>
        </div>
      </div>
      <div class="col-6 col-md-3">
        <div class="card text-bg-danger h-100">
          <div class="card-body text-center">
            <div class="display-6">{{ statistics.summary.absagen }}</div>
            <div>Absagen</div>
          </div>
        </div>
      </div>
      <div class="col-6 col-md-3">
        <div class="card text-bg-secondary h-100">
          <div class="card-body text-center">
            <div class="display-6">{{ statistics.summary.orte }}</div>
            <div>Orte</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Orte -->
    <div v-if="statistics" class="card mb-4">
      <div class="card-header">
        <h5 class="mb-0"><i class="bi bi-geo-alt"></i> Events nach Ort</h5>
      </div>
      <!-- Desktop / Tablet: Tabelle -->
      <div class="card-body p-0 d-none d-md-block">
        <div class="table-responsive">
          <table class="table table-striped mb-0 align-middle">
            <thead>
              <tr>
                <th>Ort</th>
                <th class="text-end">Events</th>
                <th class="text-end">Zusagen</th>
                <th class="text-end">Absagen</th>
                <th style="min-width: 200px;">Anteil Events</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="loc in statistics.byLocation" :key="loc.ort">
                <td><strong>{{ loc.ort }}</strong></td>
                <td class="text-end">{{ loc.eventCount }}</td>
                <td class="text-end text-success">{{ loc.zusagen || 0 }}</td>
                <td class="text-end text-danger">{{ loc.absagen || 0 }}</td>
                <td>
                  <div class="progress" style="height: 18px;">
                    <div class="progress-bar progress-bar-purple"
                      :style="{ width: locationShare(loc) + '%' }">
                      {{ locationShare(loc) }}%
                    </div>
                  </div>
                </td>
              </tr>
              <tr v-if="!statistics.byLocation.length">
                <td colspan="5" class="text-center text-muted">Keine Daten im Zeitraum</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      <!-- Mobile: Karten -->
      <ul class="list-group list-group-flush d-md-none">
        <li v-for="loc in statistics.byLocation" :key="'m-' + loc.ort" class="list-group-item">
          <div class="d-flex justify-content-between align-items-center mb-1">
            <strong>{{ loc.ort }}</strong>
            <span class="badge bg-primary">{{ loc.eventCount }} Events</span>
          </div>
          <div class="small mb-1">
            <span class="text-success me-3">
              <i class="bi bi-hand-thumbs-up"></i> {{ loc.zusagen || 0 }}
            </span>
            <span class="text-danger">
              <i class="bi bi-hand-thumbs-down"></i> {{ loc.absagen || 0 }}
            </span>
          </div>
          <div class="progress" style="height: 14px;">
            <div class="progress-bar progress-bar-purple"
              :style="{ width: locationShare(loc) + '%' }">
              {{ locationShare(loc) }}%
            </div>
          </div>
        </li>
        <li v-if="!statistics.byLocation.length" class="list-group-item text-center text-muted">
          Keine Daten im Zeitraum
        </li>
      </ul>
    </div>

    <!-- User -->
    <div v-if="statistics" class="card mb-4">
      <div class="card-header d-flex justify-content-between align-items-center flex-wrap gap-2">
        <h5 class="mb-0"><i class="bi bi-people"></i> Teilnahme je Person</h5>
        <div class="btn-group btn-group-sm">
          <button class="btn btn-outline-secondary"
            :class="{ active: sortBy === 'anwesend' }"
            @click="sortBy = 'anwesend'">Anwesend</button>
          <button class="btn btn-outline-secondary"
            :class="{ active: sortBy === 'gemeldet' }"
            @click="sortBy = 'gemeldet'">Gemeldet</button>
          <button class="btn btn-outline-secondary"
            :class="{ active: sortBy === 'name' }"
            @click="sortBy = 'name'">Name</button>
        </div>
      </div>
      <!-- Desktop / Tablet: Tabelle -->
      <div class="card-body p-0 d-none d-md-block">
        <div class="table-responsive">
          <table class="table table-striped mb-0 align-middle">
            <thead>
              <tr>
                <th>Name</th>
                <th class="text-end text-success">Anwesend</th>
                <th class="text-end text-danger">Abgesagt</th>
                <th class="text-end">Gemeldet</th>
                <th class="text-end text-muted">Offen</th>
                <th style="min-width: 180px;">Anwesenheits&shy;quote</th>
                <th style="min-width: 180px;">Melde&shy;quote</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="u in sortedUsers" :key="u.userId">
                <td>{{ u.username }}</td>
                <td class="text-end text-success fw-bold">{{ u.anwesend }}</td>
                <td class="text-end text-danger">{{ u.abwesend }}</td>
                <td class="text-end">{{ u.gemeldet }}</td>
                <td class="text-end text-muted">{{ u.offen }}</td>
                <td>
                  <div class="progress" style="height: 18px;">
                    <div class="progress-bar bg-success"
                      :style="{ width: u.anwesenheitsQuote + '%' }">
                      {{ u.anwesenheitsQuote }}%
                    </div>
                  </div>
                </td>
                <td>
                  <div class="progress" style="height: 18px;">
                    <div class="progress-bar bg-primary"
                      :style="{ width: u.meldeQuote + '%' }">
                      {{ u.meldeQuote }}%
                    </div>
                  </div>
                </td>
              </tr>
              <tr v-if="!sortedUsers.length">
                <td colspan="7" class="text-center text-muted">Keine Benutzer</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      <!-- Mobile: Karten -->
      <ul class="list-group list-group-flush d-md-none">
        <li v-for="u in sortedUsers" :key="'m-' + u.userId" class="list-group-item">
          <div class="d-flex justify-content-between align-items-center mb-2">
            <strong class="text-truncate me-2">{{ u.username }}</strong>
            <span class="badge bg-secondary">{{ u.gemeldet }}/{{ statistics.summary.eventCount }}</span>
          </div>
          <div class="row g-2 small mb-2">
            <div class="col-4 text-success">
              <i class="bi bi-hand-thumbs-up"></i> <strong>{{ u.anwesend }}</strong>
              <div class="text-muted" style="font-size: 0.75rem;">anwesend</div>
            </div>
            <div class="col-4 text-danger">
              <i class="bi bi-hand-thumbs-down"></i> <strong>{{ u.abwesend }}</strong>
              <div class="text-muted" style="font-size: 0.75rem;">abgesagt</div>
            </div>
            <div class="col-4 text-muted">
              <i class="bi bi-question-circle"></i> <strong>{{ u.offen }}</strong>
              <div style="font-size: 0.75rem;">offen</div>
            </div>
          </div>
          <div class="mb-1" style="font-size: 0.8rem;">Anwesenheitsquote</div>
          <div class="progress mb-2" style="height: 14px;">
            <div class="progress-bar bg-success"
              :style="{ width: u.anwesenheitsQuote + '%' }">
              {{ u.anwesenheitsQuote }}%
            </div>
          </div>
          <div class="mb-1" style="font-size: 0.8rem;">Meldequote</div>
          <div class="progress" style="height: 14px;">
            <div class="progress-bar bg-primary"
              :style="{ width: u.meldeQuote + '%' }">
              {{ u.meldeQuote }}%
            </div>
          </div>
        </li>
        <li v-if="!sortedUsers.length" class="list-group-item text-center text-muted">
          Keine Benutzer
        </li>
      </ul>
      <div class="card-footer text-muted small">
        <strong>Anwesenheitsquote</strong> = Anwesend / Events insgesamt.
        <strong>Meldequote</strong> = Rückmeldungen (Zu- oder Absage) / Events insgesamt.
      </div>
    </div>

    <!-- Events Liste -->
    <div v-if="statistics" class="card mb-5">
      <div class="card-header">
        <h5 class="mb-0"><i class="bi bi-calendar-event"></i> Events im Zeitraum</h5>
      </div>
      <!-- Desktop / Tablet: Tabelle -->
      <div class="card-body p-0 d-none d-md-block">
        <div class="table-responsive">
          <table class="table table-sm mb-0">
            <thead>
              <tr>
                <th>Datum</th>
                <th>Bezeichnung</th>
                <th>Ort</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="e in statistics.events" :key="e.id">
                <td>{{ formatDate(e.dateTime) }}</td>
                <td>{{ e.bezeichnung }}</td>
                <td>{{ e.ort }}</td>
              </tr>
              <tr v-if="!statistics.events.length">
                <td colspan="3" class="text-center text-muted">Keine Events im Zeitraum</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      <!-- Mobile: Karten -->
      <ul class="list-group list-group-flush d-md-none">
        <li v-for="e in statistics.events" :key="'m-' + e.id" class="list-group-item">
          <div class="d-flex justify-content-between align-items-center">
            <strong>{{ e.bezeichnung }}</strong>
            <span class="badge bg-light text-dark">{{ formatDate(e.dateTime) }}</span>
          </div>
          <div class="small text-muted">
            <i class="bi bi-geo-alt"></i> {{ e.ort }}
          </div>
        </li>
        <li v-if="!statistics.events.length" class="list-group-item text-center text-muted">
          Keine Events im Zeitraum
        </li>
      </ul>
    </div>
  </main>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';

const currentYear = new Date().getFullYear();
const from = ref(`${currentYear}-01-01`);
const to = ref(`${currentYear}-12-31`);

const statistics = ref(null);
const loading = ref(false);
const errorMessage = ref('');
const sortBy = ref('anwesend');
const onlyPast = ref(true);

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

const maxLocationEvents = computed(() => {
  if (!statistics.value) return 0;
  return statistics.value.summary.eventCount || 0;
});

function locationShare(loc) {
  if (!maxLocationEvents.value) return 0;
  return Math.round((loc.eventCount / maxLocationEvents.value) * 100);
}

const sortedUsers = computed(() => {
  if (!statistics.value) return [];
  const list = [...statistics.value.byUser];
  switch (sortBy.value) {
    case 'gemeldet':
      list.sort((a, b) => b.gemeldet - a.gemeldet || a.username.localeCompare(b.username));
      break;
    case 'name':
      list.sort((a, b) => a.username.localeCompare(b.username));
      break;
    case 'anwesend':
    default:
      list.sort((a, b) => b.anwesend - a.anwesend || a.username.localeCompare(b.username));
  }
  return list;
});

function setYear(year) {
  from.value = `${year}-01-01`;
  to.value = `${year}-12-31`;
  loadStatistics();
}

function setLastMonths(months) {
  const end = new Date();
  const start = new Date();
  start.setMonth(start.getMonth() - months);
  from.value = start.toISOString().slice(0, 10);
  to.value = end.toISOString().slice(0, 10);
  loadStatistics();
}

function formatDate(dateTime) {
  if (!dateTime) return '';
  return new Date(dateTime).toLocaleDateString('de-DE');
}

async function loadStatistics() {
  loading.value = true;
  errorMessage.value = '';
  try {
    const today = todayIso();
    const effectiveTo = onlyPast.value && to.value > today ? today : to.value;
    const params = new URLSearchParams({ from: from.value, to: effectiveTo });
    const response = await fetch(`/api/getStatistics?${params.toString()}`, {
      method: 'GET',
      credentials: 'include'
    });
    const result = await response.json();
    if (response.ok) {
      statistics.value = result.statistics;
    } else {
      errorMessage.value = result.message || 'Fehler beim Laden der Statistik';
    }
  } catch (error) {
    errorMessage.value = error.message || 'Netzwerkfehler';
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  loadStatistics();
});
</script>

<style scoped>
.display-6 {
  font-weight: 600;
}

.progress-bar-purple {
  background-color: #9432a5;
  color: #fff;
}

/* Kompaktere Karten auf Smartphones */
@media (max-width: 575.98px) {
  .display-6 {
    font-size: 1.6rem;
  }
  h2 {
    font-size: 1.4rem;
  }
  .card-header h5 {
    font-size: 1rem;
  }
}
</style>
