<template>
  <div class="container mt-5">
    <h2>Neuer Event</h2>
    <form @submit.prevent="submitForm">
      <div class="mb-3">
        <label for="name" class="form-label">Bezeichnung</label>
        <input
          type="text"
          id="bezeichnung"
          v-model="form.bezeichnung"
          class="form-control"
          required
        />
      </div>

      <div class="mb-3">
        <label for="description" class="form-label">Ort</label>
        <select
          id="description"
          v-model="form.ort"
          class="form-select"
          required
        >
          <option value="Nesselwang">Nesselwang</option>
          <option value="Rückholz">Rückholz</option>
          <option value="other">Anderer Ort</option>
        </select>
        <input
          v-if="form.ort === 'other'"
          type="text"
          class="form-control mt-2"
          placeholder="Ort eingeben"
          v-model="form.customOrt"
          required
        />
      </div>

      <div class="mb-3">
        <label for="startDatum" class="form-label">Datum Uhrzeit</label>
        <input
          type="datetime-local"
          id="dateTime"
          v-model="form.dateTime"
          class="form-control"
          required
        />
      </div>

      <button type="submit" :disabled="disabledSubmit" class="btn btn-primary">Event anlegen</button>

      <div class="m-2 text-danger" v-if="errorMessage">{{ errorMessage }}</div>
    </form>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';

const form = ref({
  bezeichnung: '',
  dateTime: '',
  ort: 'Nesselwang',
  customOrt: ''
});

const router = useRouter();
const errorMessage = ref('');
const submitted = ref(false);

const disabledSubmit = computed(() => {
  // challengeType und endDatum werden im aktuellen Formular nicht verwendet
  // Pflichtfelder: name, startDatum, ort (bzw. customOrt, falls "other")
  if (form.value.ort === 'other') {
    return form.value.name === '' || form.value.customOrt === '' || form.value.startDatum === '';
  }
  return form.value.name === '' || form.value.startDatum === '';
});

const submitForm = async () => {
  submitted.value = true;
  console.warn('Formular wird gesendet:', form.value);
  try {
    const response = await fetch('/api/addEvent', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        bezeichnung: form.value.bezeichnung,
        dateTime: form.value.dateTime,
        ort: form.value.ort === 'other' ? form.value.customOrt : form.value.ort
      }),
      credentials: 'include'
    });

    const result = await response.json();

    if (response.ok) {
      errorMessage.value = '';
      router.push('/');
    } else {
      errorMessage.value = result.message || 'Anlegen des Events fehlgeschlagen';
    }
  } catch (error) {
    console.error('Es gab ein Problem mit dem Anlegen des Events:', error);
    errorMessage.value = 'Es gab ein Problem mit dem Anlegen des Events. Bitte versuche es erneut.' + error.message;
  }
};
</script>

<style>
</style>