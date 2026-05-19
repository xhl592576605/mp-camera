import { ref } from 'vue'
import { reverseGeocode } from '@/utils/location'

export function useWatermarkPlugin(context) {
  const watermarkText = ref('')
  const currentTime = ref('')
  const currentDate = ref('')
  const currentWeekday = ref('')
  const currentLocation = ref('')

  function updateTime() {
    const now = new Date()
    const pad = n => String(n).padStart(2, '0')
    const weekdays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六']
    currentTime.value = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`
    currentDate.value = `${now.getFullYear()}.${pad(now.getMonth() + 1)}.${pad(now.getDate())}`
    currentWeekday.value = weekdays[now.getDay()]
    context.renderWatermarkPreview?.()
  }

  function updateLocation() {
    uni.getLocation({
      type: 'gcj02',
      success: async (res) => {
        currentLocation.value = await reverseGeocode(res.latitude, res.longitude)
        context.renderWatermarkPreview?.()
      },
      fail: () => {
        currentLocation.value = ''
        context.renderWatermarkPreview?.()
      },
    })
  }

  return {
    activate() {
      updateTime()
      updateLocation()
    },
    deactivate() {},
    updateTime,
    updateLocation,
    getState() {
      return {
        watermarkText,
        currentTime,
        currentDate,
        currentWeekday,
        currentLocation,
      }
    },
  }
}
