<template>
  <div class="folder-list">
    <v-card class="folder-card">
      <v-card-title class="text-h5 d-flex align-center">
        Folders
        <v-spacer></v-spacer>
        <v-btn color="primary" @click="showNewFolderDialog = true">
          <v-icon left>mdi-folder-plus</v-icon>
          New Folder
        </v-btn>
      </v-card-title>

      <v-divider></v-divider>

      <v-list class="folder-scroll">
        <v-list-item
          v-for="folder in folders"
          :key="folder"
          :title="folder"
          @click="selectFolder(folder)"
          :class="{ 'selected-folder': selectedFolder === folder }"
          rounded="lg"
          class="mb-2 mx-2"
        >
          <template v-slot:prepend>
            <v-icon :color="selectedFolder === folder ? 'primary' : 'grey'">
              mdi-folder
            </v-icon>
          </template>
        </v-list-item>
      </v-list>
    </v-card>

    <!-- New Folder Dialog -->
    <v-dialog v-model="showNewFolderDialog" max-width="500px">
      <v-card>
        <v-card-title class="text-h6">Create New Folder</v-card-title>
        <v-card-text>
          <v-text-field
            v-model="newFolderName"
            label="Folder Name"
            required
            @keyup.enter="createFolder"
            :rules="[v => !!v || 'Folder name is required']"
          ></v-text-field>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="grey" text @click="showNewFolderDialog = false">Cancel</v-btn>
          <v-btn color="primary" text @click="createFolder" :disabled="!newFolderName">Create</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script>
import axios from 'axios';

export default {
  name: 'FolderList',
  
  data() {
    return {
      folders: [],
      selectedFolder: null,
      showNewFolderDialog: false,
      newFolderName: '',
    };
  },

  mounted() {
    this.fetchFolders();
  },

  methods: {
    async fetchFolders() {
      try {
        const response = await axios.get('http://localhost:3000/api/folders');
        this.folders = response.data;
      } catch (error) {
        console.error('Error fetching folders:', error);
      }
    },

    async createFolder() {
      if (!this.newFolderName) return;

      try {
        await axios.post('http://localhost:3000/api/folders', {
          name: this.newFolderName,
        });
        this.showNewFolderDialog = false;
        this.newFolderName = '';
        await this.fetchFolders();
      } catch (error) {
        console.error('Error creating folder:', error);
      }
    },

    selectFolder(folder) {
      this.selectedFolder = folder;
      this.$emit('folder-selected', folder);
    },
  },
};
</script>

<style scoped>
.folder-list {
  margin: 20px;
  height: calc(100vh - 120px);
}

.folder-card {
  width: auto;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.folder-scroll {
  flex-grow: 1;
  overflow-y: auto;
  height: 0;
  padding: 8px 0;
}

.selected-folder {
  background-color: rgb(var(--v-theme-primary), 0.1) !important;
}

.v-list-item {
  margin-bottom: 4px;
  transition: all 0.3s ease;
}

.v-list-item:hover {
  background-color: rgb(var(--v-theme-primary), 0.05);
}
</style> 