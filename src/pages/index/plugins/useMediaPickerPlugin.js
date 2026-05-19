export function useMediaPickerPlugin(context) {
  return {
    onChooseFromAlbum() {
      uni.chooseMedia({
        count: 1,
        mediaType: ['image', 'video'],
        sourceType: ['album'],
        success: (res) => {
          const file = res.tempFiles[0]
          context.handlePickedMedia?.(file)
        },
      })
    },
  }
}
