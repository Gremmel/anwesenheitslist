<template>
  <main>
    <div v-if="event.id !== null" class="container mt-4">
      <div class="card">
        <div class="card-header">
          <h3>{{ event.bezeichnung }}</h3>
        </div>
        <div class="card-body">
          <p><strong>Ort:</strong> {{ event.ort }}</p>
          <p><strong>Datum / Uhrzeit:</strong> {{ formatDate(event.dateTime) }} um {{ formatTime(event.dateTime) }} Uhr</p>
        </div>
      </div>
      <div class="mt-4">
        <h4>Anwesenheitsliste</h4>
        <div v-for="(registerName, vIndex) in registerNames" :key="vIndex" class="card mb-3">
          <div class="card-header">
            <h5>{{ registerName }}</h5>
          </div>
          <ul class="mt-2 mb-2 ms-3">
            <li v-for="participation in participations.filter(p => p.register_name === registerName)" :key="participation.id" class="">
              {{ participation.username }}
            </li>
          </ul>
        </div>
      </div>
    </div>
    <div v-else class="container mt-4">
      <div class="alert alert-info" role="alert">
        <h4>Lade Event-Daten...</h4>
      </div>
    </div>

    <!-- Anwesenheitsliste -->
  </main>
</template>

<script setup>
import { reactive, ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();
const event = reactive({
  id: null,
  bezeichnung: '',
  dateTime: '',
  ort: ''
});

const participations = ref([]);
const register = ref([]);

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

const getEvent = async () => {
  let response;

  try {
    console.log('Fetching event with id', router.currentRoute.value.params.id);
    response = await fetch(`/api/getEvent/${router.currentRoute.value.params.id}`, {
      method: 'GET',
      credentials: 'include'  // Cookies mitsenden
    });

    const result = await response.json();
    console.log('getEvent result', result);

    if (response.ok) {
      event.id = result.event.id;
      event.bezeichnung = result.event.bezeichnung;
      event.dateTime = result.event.dateTime;
      event.ort = result.event.ort;
    } else {
      console.error('Error:', result.message);
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

const loadParticipations = async () => {
  let response;

  try {
    response = await fetch(`/api/getEventParticipations/${router.currentRoute.value.params.id}`, {
      method: 'GET',
      credentials: 'include'  // Cookies mitsenden
    });

    const result = await response.json();
    console.log('loadParticipations result', result);

    if (response.ok) {
      participations.value = result.data.participations;
      register.value = result.data.registers;
    } else {
      console.error('Error:', result.message);
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

const registerNames = computed(() => {
  // Nur eindeutige Verein-Namen zurückgeben und alphabetisch sortieren
  if (!Array.isArray(register.value)) return [];

  const list = [];
  for (const reg of register.value) {
    if (!list.includes(reg.name)) {
      list.push(reg.name);
    }
  }

  return list.sort((a, b) => a.localeCompare(b, 'de'));
});

onMounted(async () => {
  await getEvent();
  await loadParticipations();
});

</script>

<style scoped>
</style>