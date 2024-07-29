var map = new maplibregl.Map({
  container: 'map',
  style: 'https://basemaps.cartocdn.com/gl/dark-matter-nolabels-gl-style/style.json', // 地図のスタイル
  center: [139.7024, 35.6598], // 中心座標
  zoom: 4, // ズームレベル
});


let city_polygon = 'src/星Merge_city_polygon.geojson';
async function loadAndSortGeoJSON(url, property) {
  try {
      const response = await fetch(url);
      const geojson = await response.json();

      geojson.features.sort((a, b) => {
        if (a.properties[property] > b.properties[property]) return -1;
        if (a.properties[property] < b.properties[property]) return 1;
        return 0;
    });

      return geojson;
  } catch (error) {
      console.error('Error loading GeoJSON:', error);
  }
}
function showPage(features, page, pageSize) {
  const infoDiv = document.getElementById('info');
  infoDiv.innerHTML = `(Page ${page})`;
  const start = (page - 1) * pageSize;
  const end = start + pageSize;
  const pageFeatures = features.slice(start, end);

  pageFeatures.forEach((feature, index) => {
    const properties = feature.properties;
    const featureInfo = document.createElement('div');
    featureInfo.className = 'city_card';
    featureInfo.innerHTML = `<strong>${properties["pref"]} ${properties["CITY_NAME"]}</strong><br>星の数：${properties["word_total"]}`;
    featureInfo.onclick = () => {
      const coordinates = feature.geometry.coordinates;
      if (feature.geometry.type === 'Point') {
        map.flyTo({ center: coordinates, zoom: 12 }); // ズームレベルを指定
      } else if (feature.geometry.type === 'Polygon' || feature.geometry.type === 'MultiPolygon') {
        const bounds = new maplibregl.LngLatBounds();
        if (feature.geometry.type === 'Polygon') {
          feature.geometry.coordinates[0].forEach(coord => bounds.extend(coord));
        } else if (feature.geometry.type === 'MultiPolygon') {
          feature.geometry.coordinates.forEach(polygon => {
            polygon[0].forEach(coord => bounds.extend(coord));
          });
        }
        map.fitBounds(bounds, { padding: 200, maxZoom: 14 }); // ズームレベルを制限
      }
    };
    infoDiv.appendChild(featureInfo);
  });
}
function setupPagination(features, pageSize) {
  const paginationDiv = document.getElementById('pagination');
  const pageCount = Math.ceil(features.length / pageSize);

  for (let i = 1; i <= pageCount; i++) {
      const pageButton = document.createElement('span');
      pageButton.className = 'page-button';
      pageButton.innerText = i;
      pageButton.onclick = () => showPage(features, i, pageSize);
      paginationDiv.appendChild(pageButton);
  }
}

async function initializeMap(){


const sortedGeoJSON = await loadAndSortGeoJSON(city_polygon, 'word_total');

// 地物情報を表示するHTML要素を更新
// 地物情報を10件ずつ表示し、ページネーションを設定
const pageSize = 10;
showPage(sortedGeoJSON.features, 1, pageSize);
setupPagination(sortedGeoJSON.features, pageSize);


map.on('load', function() {
 
  
  map.addSource('star_polygon', {
    type: 'geojson',
    data: 'src/star_polygon.geojson'
});

map.addSource('star_city', {
  type: 'geojson',
  data: city_polygon
});
map.addSource('star_point', {
  type: 'geojson',
  data: 'src/星point.geojson',
  cluster: true,
  clusterMaxZoom: 14, // Max zoom to cluster points on
  clusterRadius: 50 // Radius of each cluster when clustering points (defaults to 50)

});

  // スタイル設定
  map.addLayer({
    id: 'star_polygon',
    type: 'fill',
    source: 'star_polygon',
    paint: {
      'fill-color': '#fde047',
      'fill-opacity': 0.8,
    }
  });
  
  map.addLayer({
    id: 'star_polygon_outline',
    type: 'line',
    source: 'star_polygon',
    paint: {
      'line-color': '#000',
      'line-width': 1 // アウトラインの太さを設定
    }
  });


  map.addLayer({
    id: 'star_city_outline',
    type: 'line',
    source: 'star_city',
    paint: {
      'line-color': '#cffafe',
      'line-opacity': 0.4,
      'line-width': 5 // アウトラインの太さを設定
    }
  });

      // star_cityにラベルを追加
      map.addLayer({
        id: 'star_polygon_labels',
        type: 'symbol',
        source: 'star_polygon',
        layout: {
          'text-field':['get', 'S_NAME'], // ラベルとして表示するプロパティ名
          'text-size': 12, // テキストのサイズ
          'text-anchor': 'center'
        },
        paint: {
          'text-color': '#ffffff', // テキストの色
          'text-halo-color': '#000000', // テキストの縁取りの色
          'text-halo-width': 1 // テキストの縁取りの幅
        }
      });


      // star_cityにラベルを追加
      map.addLayer({
        id: 'city_polygon_labels',
        type: 'symbol',
        source: 'star_city',
        layout: {
          'text-field':['format',
            ['get', 'pref'], {'text-line-height': 1.2},
            '\n', {},
            ['get', 'CITY_NAME'], {'text-line-height': 1.2}
          ], // ラベルとして表示するプロパティ名
          'text-size': 20, // テキストのサイズ
          'text-anchor': 'center'
        },
        paint: {
          'text-color': '#cffafe', // テキストの色
          'text-halo-color': '#000000', // テキストの縁取りの色
          'text-halo-width': 1 // テキストの縁取りの幅
        }
      });

    
  
    // クラスタリングのスタイル設定
  map.addLayer({
    id: 'star_point',
    type: 'circle',
    source: 'star_point',
    filter: ['has', 'point_count'],
    paint: {
      'circle-color': [
          'step',
          ['get', 'point_count'],
          '#fbbf24',
          20,
          '#f1f075',
          100,
          '#cffafe'
      ],
      'circle-radius': [
          'step',
          ['get', 'point_count'],
          20,
          20,
          40,
          100,
          60
      ],
    'circle-blur': 1 // ブラー効果を追加
  }
  });

  // When a click event occurs on a feature in the states layer,
// open a popup at the location of the click, with description
// HTML from the click event's properties.

map.on('click', 'star_city', (e) => {
  new maplibregl.Popup()
  .setLngLat(e.lngLat)
  .setHTML(e.features[0].properties.pref
    + '<br>' + e.features[0].properties.CITY_NAME
    + '<br>' +'星の数：'+ e.features[0].properties.word_total)
  .addTo(map);
  });

  map.on('click', 'star_polygon', (e) => {
    const prefName = e.features[0].properties.PREF_NAME;
    const cityName = e.features[0].properties.CITY_NAME;
    const sName = e.features[0].properties.S_NAME.replace(/星/g, '<span style="color:red;">星</span>'); // "星"を赤色に変更
  
    new maplibregl.Popup()
      .setLngLat(e.lngLat)
      .setHTML(prefName + '<br>' + cityName + '<br>' + sName)
      .addTo(map);
  });


 
// Change the cursor to a pointer when
// the mouse is over the states layer.
map.on('mouseenter', 'star_polygon', () => {
  map.getCanvas().style.cursor = 'pointer';
  });
   
  // Change the cursor back to a pointer
  // when it leaves the states layer.
  map.on('mouseleave', 'star_polygon', () => {
  map.getCanvas().style.cursor = '';
  });
  
  map.on('mouseenter', 'star_city', () => {
    map.getCanvas().style.cursor = 'pointer';
    });
     
    // Change the cursor back to a pointer
    // when it leaves the states layer.
    map.on('mouseleave', 'star_city', () => {
    map.getCanvas().style.cursor = '';
    });


});


}

initializeMap()

// info-containerを折りたたみ/展開するためのイベントリスナーを追加
document.getElementById('info-header').addEventListener('click', function() {
  const info = document.getElementById('info');
  const info_con = document.getElementById('info-container');
  const pagination = document.getElementById('pagination');
  if (info.style.display === 'none') {
      info.style.display = 'block';
      info_con.style.height = '85%';
      pagination.style.display = 'block';
  } else {
      info.style.display = 'none';
      info_con.style.height = '50px';
      pagination.style.display = 'none';
  }
});