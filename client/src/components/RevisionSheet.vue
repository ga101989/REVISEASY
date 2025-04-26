<template>
  <div class="revision-sheet">
    <v-card class="sheet-card">
      <v-card-title class="text-h5 d-flex align-center">
        Revision Sheets
        <v-spacer></v-spacer>
        <v-btn
          color="primary"
          :disabled="!selectedFolder"
          @click="$refs.fileInput.click()"
          prepend-icon="mdi-upload"
        >
          Upload File
        </v-btn>
        <input
          ref="fileInput"
          type="file"
          accept=".pdf,.docx,.txt"
          style="display: none"
          @change="handleFileUpload"
        />
      </v-card-title>

      <v-divider></v-divider>

      <v-card-text v-if="!selectedFolder" class="text-center py-8">
        <v-icon size="64" color="grey">mdi-folder-open</v-icon>
        <div class="text-h6 mt-4">Please select a folder first</div>
      </v-card-text>

      <v-list v-else class="sheet-scroll">
        <v-list-item
          v-for="sheet in revisionSheets"
          :key="sheet.id"
          @click="viewSheet(sheet)"
          class="mb-4 mx-2"
          rounded="lg"
        >
          <template v-slot:prepend>
            <v-icon :color="getFileIconColor(sheet.title)">
              {{ getFileIcon(sheet.title) }}
            </v-icon>
          </template>

          <v-list-item-title class="text-h6 mb-1">
            {{ sheet.title }}
          </v-list-item-title>

          <v-list-item-subtitle>
            <div class="text-grey">
              {{ new Date(sheet.createdAt).toLocaleDateString() }}
            </div>
            <div class="summary-text mt-2">
              {{ sheet.summary.mainPoints[0] }}
            </div>
          </v-list-item-subtitle>

          <template v-slot:append>
            <div class="d-flex align-center">
              <v-badge
                v-if="sheet.images?.length"
                :content="sheet.images.length"
                color="info"
                class="me-2"
              >
                <v-icon>mdi-image-multiple</v-icon>
              </v-badge>
              <v-badge
                v-if="sheet.summary.examples?.length"
                :content="sheet.summary.examples.length"
                color="success"
              >
                <v-icon>mdi-lightbulb</v-icon>
              </v-badge>
            </div>
          </template>
        </v-list-item>
      </v-list>
    </v-card>

    <!-- View Sheet Dialog -->
    <v-dialog v-model="showViewDialog" fullscreen>
      <v-card>
        <v-toolbar dark color="primary">
          <v-btn icon dark @click="showViewDialog = false">
            <v-icon>mdi-close</v-icon>
          </v-btn>
          <v-toolbar-title>{{ selectedSheet?.title }}</v-toolbar-title>
          <v-spacer></v-spacer>
          <v-btn
            icon
            variant="text"
            @click="copyContent"
            :color="copied ? 'success' : undefined"
          >
            <v-icon>{{ copied ? 'mdi-check' : 'mdi-content-copy' }}</v-icon>
          </v-btn>
        </v-toolbar>

        <v-container fluid>
          <v-row>
            <v-col cols="12" md="8">
              <v-card flat>
                <v-card-title class="text-h6">Content</v-card-title>
                <v-card-text class="text-pre-wrap">
                  {{ selectedSheet?.content }}
                </v-card-text>
              </v-card>
            </v-col>

            <v-col cols="12" md="4">
              <div class="summary-sidebar">
                <!-- Main Points -->
                <v-card flat class="mb-4">
                  <v-card-title class="text-h6">
                    <v-icon color="primary" class="me-2">mdi-star</v-icon>
                    Key Points
                  </v-card-title>
                  <v-card-text>
                    <div class="summary-points">
                      <div
                        v-for="(point, index) in selectedSheet?.summary.mainPoints"
                        :key="index"
                        class="summary-point"
                      >
                        <v-icon color="primary" size="small" class="me-2">
                          mdi-chevron-right
                        </v-icon>
                        {{ point }}
                      </div>
                    </div>
                  </v-card-text>
                </v-card>

                <!-- Examples -->
                <v-card flat class="mb-4" v-if="selectedSheet?.summary.examples.length">
                  <v-card-title class="text-h6">
                    <v-icon color="success" class="me-2">mdi-lightbulb</v-icon>
                    Examples
                  </v-card-title>
                  <v-card-text>
                    <v-expansion-panels>
                      <v-expansion-panel
                        v-for="(example, index) in selectedSheet.summary.examples"
                        :key="index"
                      >
                        <v-expansion-panel-title>
                          {{ example.title || `Example ${index + 1}` }}
                        </v-expansion-panel-title>
                        <v-expansion-panel-text>
                          {{ example.content }}
                        </v-expansion-panel-text>
                      </v-expansion-panel>
                    </v-expansion-panels>
                  </v-card-text>
                </v-card>

                <!-- Diagrams -->
                <v-card flat class="mb-4" v-if="selectedSheet?.summary.diagrams.length">
                  <v-card-title class="text-h6">
                    <v-icon color="info" class="me-2">mdi-chart-box</v-icon>
                    Diagrams & Figures
                  </v-card-title>
                  <v-card-text>
                    <v-expansion-panels>
                      <v-expansion-panel
                        v-for="(diagram, index) in selectedSheet.summary.diagrams"
                        :key="index"
                      >
                        <v-expansion-panel-title>
                          {{ diagram.title || `Figure ${index + 1}` }}
                        </v-expansion-panel-title>
                        <v-expansion-panel-text>
                          {{ diagram.content }}
                        </v-expansion-panel-text>
                      </v-expansion-panel>
                    </v-expansion-panels>
                  </v-card-text>
                </v-card>

                <!-- Images -->
                <v-card flat v-if="selectedSheet?.images?.length">
                  <v-card-title class="text-h6">
                    <v-icon color="purple" class="me-2">mdi-image-multiple</v-icon>
                    Images
                  </v-card-title>
                  <v-card-text>
                    <v-row>
                      <v-col
                        v-for="(image, index) in selectedSheet.images"
                        :key="index"
                        cols="12"
                        sm="6"
                      >
                        <v-card @click="openImageDialog(image)">
                          <v-img
                            :src="image.url"
                            height="200"
                            cover
                            class="rounded-lg"
                          >
                            <template v-slot:placeholder>
                              <v-row
                                class="fill-height ma-0"
                                align="center"
                                justify="center"
                              >
                                <v-progress-circular
                                  indeterminate
                                  color="primary"
                                ></v-progress-circular>
                              </v-row>
                            </template>
                          </v-img>
                          <v-card-text class="text-caption">
                            Page {{ image.page }}
                          </v-card-text>
                        </v-card>
                      </v-col>
                    </v-row>
                  </v-card-text>
                </v-card>
              </div>
            </v-col>
          </v-row>
        </v-container>
      </v-card>
    </v-dialog>

    <!-- Image Preview Dialog -->
    <v-dialog v-model="showImageDialog" max-width="90vw">
      <v-card>
        <v-img
          :src="selectedImage?.url"
          max-height="90vh"
          contain
        ></v-img>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn icon @click="showImageDialog = false">
            <v-icon>mdi-close</v-icon>
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script>
import axios from 'axios';

export default {
  name: 'RevisionSheet',

  props: {
    selectedFolder: {
      type: String,
      default: null,
    },
  },

  data() {
    return {
      revisionSheets: [],
      showViewDialog: false,
      showImageDialog: false,
      selectedSheet: null,
      selectedImage: null,
      copied: false,
    };
  },

  watch: {
    selectedFolder: {
      immediate: true,
      handler(newFolder) {
        if (newFolder) {
          this.fetchRevisionSheets();
        } else {
          this.revisionSheets = [];
        }
      },
    },
  },

  methods: {
    async fetchRevisionSheets() {
      if (!this.selectedFolder) return;

      try {
        const response = await axios.get(
          `http://localhost:3000/api/revision-sheets/${this.selectedFolder}`
        );
        this.revisionSheets = response.data;
      } catch (error) {
        console.error('Error fetching revision sheets:', error);
      }
    },

    async handleFileUpload(event) {
      const file = event.target.files[0];
      if (!file) return;

      const formData = new FormData();
      formData.append('file', file);
      formData.append('folderId', this.selectedFolder);

      try {
        await axios.post('http://localhost:3000/api/upload', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
        this.fetchRevisionSheets();
      } catch (error) {
        console.error('Error uploading file:', error);
      }

      // Clear the input
      event.target.value = '';
    },

    viewSheet(sheet) {
      this.selectedSheet = sheet;
      this.showViewDialog = true;
      this.copied = false;
    },

    openImageDialog(image) {
      this.selectedImage = image;
      this.showImageDialog = true;
    },

    async copyContent() {
      if (!this.selectedSheet?.content) return;
      
      try {
        await navigator.clipboard.writeText(this.selectedSheet.content);
        this.copied = true;
        setTimeout(() => {
          this.copied = false;
        }, 2000);
      } catch (error) {
        console.error('Error copying content:', error);
      }
    },

    getFileIcon(filename) {
      const ext = filename.split('.').pop().toLowerCase();
      switch (ext) {
        case 'pdf':
          return 'mdi-file-pdf-box';
        case 'docx':
          return 'mdi-file-word';
        case 'txt':
          return 'mdi-file-document';
        default:
          return 'mdi-file';
      }
    },

    getFileIconColor(filename) {
      const ext = filename.split('.').pop().toLowerCase();
      switch (ext) {
        case 'pdf':
          return 'error';
        case 'docx':
          return 'primary';
        case 'txt':
          return 'success';
        default:
          return 'grey';
      }
    },
  },
};
</script>

<style scoped>
.revision-sheet {
  margin: 20px;
  height: calc(100vh - 120px);
}

.sheet-card {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.sheet-scroll {
  flex-grow: 1;
  overflow-y: auto;
  height: 0;
  padding: 8px 0;
}

.text-pre-wrap {
  white-space: pre-wrap;
  font-family: 'Roboto', sans-serif;
  line-height: 1.6;
  max-height: calc(100vh - 300px);
  overflow-y: auto;
}

.summary-text {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
  color: rgba(0, 0, 0, 0.6);
}

.summary-sidebar {
  height: calc(100vh - 200px);
  overflow-y: auto;
  padding-right: 16px;
}

.summary-points {
  padding: 8px;
}

.summary-point {
  margin-bottom: 16px;
  line-height: 1.5;
  display: flex;
  align-items: flex-start;
}

.v-list-item {
  cursor: pointer;
  transition: all 0.3s ease;
}

.v-list-item:hover {
  background-color: rgb(var(--v-theme-primary), 0.05);
}

.v-expansion-panels {
  background: transparent !important;
}

.v-expansion-panel {
  background: rgba(var(--v-theme-surface), 0.8) !important;
  margin-bottom: 8px;
}
</style> 