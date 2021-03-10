var map, wfsLayer
var drawControl, modifyControl, selectControl
var selectedFeatures
var geoserverData = {
  wsName: 'test',
  uri: 'www.gogmap.com/map/test',
  wfsURL: 'http://localhost:8090/geoserver/test/ows?',
  layer: 'tasmania_roads'
}

var map = new ol.Map({
  target: 'map',
  layers: [
    new ol.layer.Tile({
      source: new ol.source.OSM()
    })
  ],
  view: new ol.View({
    projection: 'EPSG:4326',
    center: [146.79, -41.92],
    // center: [112, 32],
    zoom: 8
  })
});

var wfsLayer = new ol.layer.Vector({
  source: new ol.source.Vector(),
  style: new ol.style.Style({
    stroke: new ol.style.Stroke({
      color: 'rgba(0, 0, 255, 1.0)',
      width: 2,
    }),
  })
})
map.addLayer(wfsLayer)

// 加载绘图控件
drawControl = new ol.interaction.Draw({
  source: wfsLayer.getSource(),
  type: 'LineString'
  // type: 'Point'
})
drawControl.setActive(false)
map.addInteraction(drawControl)
var listener
drawControl.on('drawstart', (evt) => {
  let sketch = evt.feature
  let listener = sketch.on('change', (gEvt) => {
    var ft = evt.feature
    showWKT(ft)
  })
})

drawControl.on('drawend', (evt)=> {
  ol.Observable.unByKey(listener)
})

// 添加选择控件
selectControl = new ol.interaction.Select()
map.addInteraction(selectControl)
selectedFeatures = this.selectControl.getFeatures()
selectedFeatures.on('add', (evt) => {
  // 内容区显示
  let ft = evt.element
  let wkt = new ol.format.WKT().writeFeature(ft)
  let texearr = document.getElementById('textarea')
  texearr.value = wkt
})

// 添加修改控件
modifyControl = new ol.interaction.Modify({
  features: this.selectControl.getFeatures(),
})
modifyControl.setActive(false)
map.addInteraction(modifyControl)
modifyControl.on('modifyend', (evt) => {
  console.log(evt)
  let feature = evt.features.getArray()[0]
  showWKT(feature)
})

function showWKT(feature) {
  let wkt = new ol.format.WKT().writeFeature(feature)
  let texearr = document.getElementById('textarea')
  texearr.value = wkt
}


function changeMode(mode) {
  console.log(mode)
  if(mode === 'add') {
    drawControl.setActive(true)
    modifyControl.setActive(false)
  } else {
    drawControl.setActive(false)
    modifyControl.setActive(true)
  }
}

function saveHandle() {
  let feature = selectedFeatures.getArray()[0]
  if (feature) {
    let id = feature.getId()
    // 修改的要素
    if(id) {
      updateFeatures([feature])
    } else {
      addFeatures([feature])
    }
  }
}

function delHandle() {
  let feature = selectedFeatures.getArray()[0]
  if (feature) {
    deleteFeatures([feature])
  }
}

function loadDataByWfsGetFeature() {
  var data = {
    srcName: 'EPSG:4326',
    featureNS: geoserverData.uri,
    featurePrefix: geoserverData.wsName,
    featureTypes: [geoserverData.layer],
    outputFormat: 'application/json'
  }
  var request = new ol.format.WFS().writeGetFeature(data)
  fetch(geoserverData.wfsURL, {
    method: 'POST',
    body: new XMLSerializer().serializeToString(request),
  }).then(function (response) {
    return response.json()
  }).then(function (json) {
    var features = new ol.format.GeoJSON({
        geometryName: 'geom',
    }).readFeatures(json)
    if (wfsLayer) {
      wfsLayer.getSource().addFeatures(features)
    }
  })
}

function createUpdateFeature (feature) {
  // 1、构造Feature
  ft = feature.clone()
  // 更新操作必须要有id
  let id = feature.getId()
  ft.setId(id)

  let geom = ft.getGeometry().clone()
  geom.applyTransform((flatCoordinates, flatCoordinates2, stride) => {
    for (var j = 0; j < flatCoordinates.length; j += stride) {
      var y = flatCoordinates[j]
      var x = flatCoordinates[j + 1]
      flatCoordinates[j] = x
      flatCoordinates[j + 1] = y
    }
  })
  ft.setGeometry(geom)
  return ft
}

function createAddFeature(feature) {
  // 1、构造Feature
  let ft = new ol.Feature()
  let properties = wfsLayer.getSource().getFeatures()[0].getProperties()
  delete properties.geometry
  properties.type = 'road'
  ft.setProperties(properties)

  let geom = feature.getGeometry().clone()
  geom.applyTransform((flatCoordinates, flatCoordinates2, stride) => {
    for (var j = 0; j < flatCoordinates.length; j += stride) {
      var y = flatCoordinates[j]
      var x = flatCoordinates[j + 1]
      flatCoordinates[j] = x
      flatCoordinates[j + 1] = y
    }
  })
  ft.setGeometryName('geom') // 一定要放在setGemetry之前
  ft.setGeometry(geom)
  return ft
}

function addFeatures(features) {
  let newFeatureList = features.map(addFeature)
  transaction(newFeatureList, null, null)
}

function updateFeatures(features) {
  let newFeatureList = features.map(updateFeature)
  transaction(null, newFeatureList, null)
}

function deleteFeatures(features) {
  transaction(null, null, features)

  // 页面中不再展示
  features.forEach((item) => {
    item.setGeometry(null)
  })
}

function transaction(inserts, updates, deletes) {
  let WFSTSerializer = new ol.format.WFS()
  var featObject = WFSTSerializer.writeTransaction(inserts,
    updates, deletes, {
      featureType: geoserverData.layer,
      featureNS: geoserverData.uri,
      srsName: 'EPSG:4326'
    })
  var serializer = new XMLSerializer()
  var featString = serializer.serializeToString(featObject)

  return fetch(geoserverData.wfsURL, {
    method: 'POST',
    body: featString
  })
}

loadDataByWfsGetFeature()