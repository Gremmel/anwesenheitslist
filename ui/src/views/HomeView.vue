<template>
  <main>
    <div class="text-center mt-4">
      <h2 v-if="userActive">
        Events
      </h2>
      <div v-if="userActive" class="container">
        <div class="row">
          <div class="col-md-4 mb-4" v-for="event in eventList" :key="event.id">
            <div class="card h-100 event-card" :style="eventParticipation[event.id] ? 'border: solid 2px green;' : ''">
              <div class="card-header">
                <button @click="showDetails(event)" class="btn btn-sm btn-secondary me-2 float-start">
                  <i class="bi bi-info-circle"></i> Details
                </button>
                <!-- Bezeichnung -->
                <h5 class="card-title fw-bold">{{ event.bezeichnung }}</h5>
              </div>
              <div class="card-body text-center p-1">
                <!-- Ort -->
                <div class="mb-2">
                  <span class="badge me-1" :class="cardColor(event.ort)"><i class="bi bi-geo-alt"></i> {{ event.ort }}</span>
                </div>
                <!-- Noch -->
                <div class="mb-1">
                  <span class="text-dark px-3 py-2">
                    <span v-if="dayLabel(event.dateTime) === 'Tage'" class="fw-bold">
                      Noch:
                      {{ daysUntil(event.dateTime) }}
                    </span>
                    {{ dayLabel(event.dateTime) }}
                  </span>
                </div>
                <!-- Datum und Uhrzeit -->
                <div class="row">
                  <div class="col">
                    <i class="bi bi-calendar-event"></i> <strong>Datum:</strong>
                  </div>
                  <div class="col text-start">
                    {{ formatDate(event.dateTime) }}
                  </div>
                </div>
                <div class="row">
                  <div class="col">
                    <i class="bi bi-clock"></i> <strong>Uhrzeit:</strong>
                  </div>
                  <div class="col text-start">
                    {{ formatTime(event.dateTime) }}
                  </div>
                </div>

                <!-- Teilnahme-Switch -->
                <div class="row">
                  <div class="col">
                    Ich bin dabei
                  </div>
                  <div class="col text-start">
                    <div class="form-check form-switch">
                      <input class="form-check-input" role="switch" type="checkbox"
                        :id="'eventSwitch-' + event.id"
                        v-model="eventParticipation[event.id]"
                        @change="toggleParticipation(event)"
                      >
                    </div>
                  </div>
                </div>

                <div v-if="isAdmin" class="mt-3 text-end">
                  <button @click="clickDeleteEvent(event)" class="btn btn-sm btn-danger">
                    <i class="bi bi-trash"></i> Löschen
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <!-- user ist nicht Aktiv -->
      <div v-else class="container mt-4">
        <div class="alert alert-warning" role="alert">
          <h4>nicht aktiv</h4>
        </div>
      </div>

    </div>
  </main>
</template>

<script setup>
// Card-Farbe je nach Ort
function cardColor(ort) {
  if (ort === 'Nesselwang') return 'event-card-nesselwang';
  if (ort === 'Rückholz') return 'event-card-rueckholz';
  return 'event-card-other';
}

import { reactive, ref, computed, onMounted, onUnmounted } from 'vue';
import { useUserStore } from '@/stores/userStore';
import { useDialogStore } from '@/stores/dialogStore';
import { useRouter } from 'vue-router';

const router = useRouter();

const events = reactive([]);
// Teilnahme-Status pro Event (eventId: true/false)
const eventParticipation = reactive({});

// Teilnahme-Status für alle Events laden
async function loadParticipation() {
  try {
    const response = await fetch(`/api/getEventParticipation/${userStore.user.id}`, {
      method: 'GET',
      credentials: 'include'
    });
    const result = await response.json();

    console.log('loadParticipation result', result);

    if (response.ok && result.participation) {
      // participation: Array<{event_id, participate}>
      for (const p of result.participation) {
        eventParticipation[p.event_id] = true;
      }
    }
  } catch (error) {
    console.error('Fehler beim Laden der Teilnahme:', error);
  }
}

// Teilnahme toggeln und speichern
async function toggleParticipation(event) {
  try {
    const response = await fetch('/api/setEventParticipation', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        userId: userStore.user.id,
        eventId: event.id,
        zugesagt: eventParticipation[event.id]
      })
    });
    const result = await response.json();
    if (!response.ok) {
      console.error('Fehler beim Speichern der Teilnahme:', result.message);
    }
  } catch (error) {
    console.error('Fehler beim Speichern der Teilnahme:', error);
  }
}
const userStore = useUserStore();
const dialogStore = useDialogStore();
const delEventId = ref(null);

const isAdmin = computed(() => {
  return userStore.hasRole('admin');
});

const userActive = computed(() => {
  return userStore.isEnabled;
});

const deleteEvent = async () => {
  console.log('deleteEvent eventId', delEventId.value);
  let response;

  try {
    response = await fetch(`/api/deleteEvent/${delEventId.value}`, {
      method: 'POST',
      credentials: 'include'
    });

    const result = await response.json();

    if (response.ok) {
      getEvents();
    } else {
      console.error('Error:', result.message);
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

const clickDeleteEvent = (event) => {
  console.log('clickDeleteEvent', event.id);
  delEventId.value = event.id;

  dialogStore.openDeleteDialog(
    'Event löschen',
    `das Event <b>${event.bezeichnung}</b> wirklich löschen?`,
    deleteEvent,
  );
}

const showDetails = (event) => {
  console.log('showDetails', event.id);
  router.push({ name: 'eventDetails', params: { id: event.id } });
}

// Berechnete EventList
const eventList = computed(() => {
  const list = [];
  const now = new Date();
  now.setHours(0, 0, 0, 0); // Nur das Datum vergleichen

  for (const event of events) {
    const eventDate = new Date(event.dateTime);
    eventDate.setHours(0, 0, 0, 0);
    if (eventDate >= now) {
      list.push({
        id: event.id,
        bezeichnung: event.bezeichnung,
        ort: event.ort,
        dateTime: event.dateTime
      });
    }
  }
  return list;
});

function formatDate(dateTime) {
  if (!dateTime) return '';
  const date = new Date(dateTime);
  return date.toLocaleDateString('de-DE');
}

function formatTime(dateTime) {
  if (!dateTime) return '';
  const date = new Date(dateTime);
  return date.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
}

function daysUntil(dateTime) {
  if (!dateTime) return '';
  const now = new Date();
  const eventDate = new Date(dateTime);
  // Nur Datum vergleichen, Uhrzeit ignorieren
  eventDate.setHours(0,0,0,0);
  now.setHours(0,0,0,0);
  const diff = eventDate - now;
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

function dayLabel(dateTime) {
  const days = daysUntil(dateTime);
  if (days === 0) return 'Heute';
  if (days === 1) return 'Morgen';
  if (days === 2) return 'Übermorgen';
  return 'Tage';
}

const getEvents = async () => {
  let response;

  try {
    response = await fetch(`/api/getEvents`, {
      method: 'GET',
      credentials: 'include'  // Cookies mitsenden
    });

    const result = await response.json();
    console.log('getEvents result', result);

    if (response.ok) {
      events.splice(0);

      for (const event of result.list) {
        events.push(event);
      }
    } else {
      console.error('Error:', result.message);
    }
  } catch (error) {
    console.error('Error:', error);
  }
}


onMounted(async () => {
  //getSessionData();
  await getEvents();
  await loadParticipation();
});

onUnmounted(() => {
  console.log('onUnmounted');
});

</script>

<style scoped>
/* Modernes Card-Design */
/* Farben je nach Ort */
.event-card-nesselwang {
  background-color:#269bab;
}
.event-card-rueckholz {
  background-color:#87b059;
}
.event-card-other {
  background-color:#9432a5;
}

.card-header {
  border-bottom: none;
}

.card-title {
  font-size: 1.25rem;
  letter-spacing: 0.01em;
}
.badge {
  font-size: 1em;
}
.list-unstyled li {
  margin-bottom: 0.2em;
}
.shadow-sm {
  box-shadow: 0 1px 4px rgba(0,0,0,0.08);
}
</style>