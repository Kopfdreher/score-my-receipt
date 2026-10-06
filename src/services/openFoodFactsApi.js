import constants from '../constants'

const OP_DEFAULT_HEADERS = {
  'Content-Type': 'application/json'
}

export default {
  openfoodfactsProductSearch(code) {
    const url = `${constants.OFF_API_URL}/${code}.json`
    return fetch(url, {
      method: 'GET',
      headers: OP_DEFAULT_HEADERS
    })
      .then((response) => response.json())
  }
}
