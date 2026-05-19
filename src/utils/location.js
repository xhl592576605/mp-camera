const MAP_KEY = ''

/**
 * 逆地理编码：经纬度 → 中文地址（高德地图 WebService API）
 * 申请地址：https://lbs.amap.com/api/webservice/guide/api/georegeo
 * @returns {{ address: string, coord: string }}
 */
export function reverseGeocode(latitude, longitude) {
  const coord = `(${latitude.toFixed(4)}, ${longitude.toFixed(4)})`
  if (!MAP_KEY) {
    return Promise.resolve({ address: '', coord })
  }
  return new Promise((resolve) => {
    uni.request({
      url: 'https://restapi.amap.com/v3/geocode/regeo',
      data: {
        location: `${longitude},${latitude}`,
        key: MAP_KEY,
        extensions: 'base',
      },
      success: (res) => {
        if (res.data && res.data.status === '1' && res.data.regeocode) {
          resolve({ address: res.data.regeocode.formatted_address, coord })
        } else {
          resolve({ address: '', coord })
        }
      },
      fail: () => {
        resolve({ address: '', coord })
      },
    })
  })
}
