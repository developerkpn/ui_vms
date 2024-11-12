import { create } from 'zustand';

const sortingFile = (fileArr) => {
  return fileArr.sort((a, b) => {
    if (a.file_type < b.file_type) {
      return -1;
    }
    if (a.file_type > b.file_type) {
      return 1;
    }
    return 0;
  });
};

const useFileStore = create((set, get) => {
  const DeleteTempFile = async (id_file, axiosPrivate) => {
    try {
      const { data } = await axiosPrivate.post(`/ticeddet/delfiletemp`, {
        file_id: id_file,
      });
    } catch (error) {
      throw error;
    }
  };

  return {
    files: [],
    delStgFiles: {},
    changesFiles: {},
    fileTypes: [],
    setFiles: (newfiles) => {
      const sortedFile = sortingFile(newfiles);
      set({ files: sortedFile });
    },
    setDelStgFiles: (file) => {
      set((state) => {
        let stgFile = state.delStgFiles;
        stgFile[file.file_type] = file;
        const changedFile = { ...state.changesFiles, [file.id]: { ...file, method: 'delete' } };
        return {
          delStgFiles: stgFile,
          changesFiles: changedFile,
        };
      });
    },
    rmDelStgFiles: (file) => {
      set((state) => {
        let stgFile = state.delStgFiles;
        const changedFile = { ...state.changesFiles };
        delete changedFile[file.id];
        if (stgFile[file.file_type]) {
          delete stgFile[file.file_type];
        }
        return {
          delStgFiles: stgFile,
          changesFiles: changedFile,
        };
      });
    },
    addFile: (file) =>
      set((state) => {
        const newFiles = sortingFile([...state.files, file]);
        const changedFile = { ...state.changesFiles, [file.id]: file };

        return { files: newFiles, changesFiles: changedFile };
      }),
    deleteFile: async (file, axiosPrivate) => {
      if (file.source !== 'local') {
        await DeleteTempFile(file.id, axiosPrivate);
      }
      set((state) => {
        const newFiles = state.files.filter((item) => item.id !== file.id);
        const changedFile = { ...state.changesFiles };
        delete changedFile[file.id];
        return { files: newFiles, changesFiles: changedFile };
      });
    },
    flagDelete: (id_file) =>
      set((state) => {
        const newFile = state.files.map((item) => {
          if (item.id === id_file) {
            return {
              ...item,
              method: 'delete',
            };
          }
          return item;
        });
        const newFiles = sortingFile(newFile);
        return {
          files: newFiles,
        };
      }),
    unFlagDelete: async (id_file, axiosPrivate) => {
      const files = get().files;

      let file_type;
      let fileData;
      const newFile = files.map((item) => {
        if (item.id === id_file) {
          file_type = item.file_type;
          fileData = item;
          return {
            ...item,
            method: '',
          };
        }
        return item;
      });
      let filteredFile = newFile;
      let changedFile = get().changesFiles;
      if (fileData && fileData.source === 'server') {
        await axiosPrivate.post('/ticeddet/unflagdelete', {
          file_id: fileData.id,
        });
      }

      if (file_type) {
        let fileReplacement = newFile.find((item) => item.file_type === file_type && item.method === 'new');
        if (fileReplacement) {
          if (fileReplacement.source !== 'local') {
            await DeleteTempFile(fileReplacement.id, axiosPrivate);
          }
          delete changedFile[fileReplacement.id];
        }
        filteredFile = newFile.filter((item) => !(item.file_type === file_type && item.method === 'new'));
      }

      const newFiles = sortingFile(filteredFile);
      set({
        files: newFiles,
        changesFiles: changedFile,
      });
    },
    setFileTypes: (fileType) => {
      set({ fileTypes: fileType });
    },
    setAlltoServer: () => {
      set((state) => {
        let allFile = state.files.map((item) => ({ ...item, source: 'server' }));
        return {
          files: allFile,
        };
      });
    },
  };
});

export default useFileStore;
