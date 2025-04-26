<script>
import { createVuetify } from 'vuetify';
import FolderList from './components/FolderList.vue';
import RevisionSheet from './components/RevisionSheet.vue';

export default {
  name: 'App',
  components: {
    FolderList,
    RevisionSheet,
  },

  data() {
    return {
      selectedFolder: null,
    };
  },
};
</script>

<template>
  <v-app>
    <v-app-bar app color="primary" dark>
      <v-app-bar-title>ReviseEasy</v-app-bar-title>
    </v-app-bar>

    <v-main>
      <v-container fluid class="fill-height pa-0">
        <v-row no-gutters style="height: 100%;">
          <v-col cols="3" class="fill-height">
            <folder-list @folder-selected="selectedFolder = $event" />
          </v-col>
          <v-col cols="9" class="fill-height">
            <revision-sheet :selected-folder="selectedFolder" />
          </v-col>
        </v-row>
      </v-container>
    </v-main>
  </v-app>
</template>

<style>
@import '@mdi/font/css/materialdesignicons.css';

.v-main {
  background-color: #f5f5f5;
}

.v-container {
  max-width: none !important;
}
</style>
