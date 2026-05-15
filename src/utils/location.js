const MAP_KEY = ''

export function reverseGeocode(latitude, longitude) {
  if (!MAP_KEY) {
    return Promise.resolve(formatCoord(latitude, longitude))
  }
  return new Promise((resolve) => {
    uni.request({
      url: 'https://apis.map.qq.com/ws/geocoder/v1/',
      data: {
        location: `${latitude},${longitude}`,
        key: MAP_KEY,
        get_poi: 0,
        poi_options: 'address_format=short'
      },
      success: (res) => {
        if (res.data && res.data.status === 0) {
          const comp = res.data.result.address_component
          resolve(`${comp.province}${comp.city}${comp.district}`)
        } else {
          resolve(formatCoord(latitude, longitude))
        }
      },
      fail: () => {
        resolve(formatCoord(latitude, longitude))
      }
    })
  })
}

function formatCoord(lat, lng) {
  return `${lat.toFixed(4)}°N, ${lng.toFixed(4)}°E`
}
