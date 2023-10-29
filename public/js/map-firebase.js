$(document).ready(function () {
  const host = window.location.origin;
  const apiUrl = 'https://share-location.merryblue.llc/sharinglocation/api/v0/public/live-tracking/' + userId
  const firebaseConfig = {
    apiKey: "AIzaSyDO6esatJ8i14whnx7jzdevf37N9X4bRes",
    authDomain: "location-sharing-abdc2.firebaseapp.com",
    projectId: "location-sharing-abdc2",
    storageBucket: "location-sharing-abdc2.appspot.com",
    messagingSenderId: "706387942723",
    appId: "1:706387942723:web:acaa81aabe6a57ab5ea3f6",
    measurementId: "G-HY33PGT11H"
  };
  const publicKey = 'BKP-3EWy-hmqgx35du99Er41ert3GwRaL_ZF2T_IoJnVJ6MoCeiGp6um2C-Qnnt9MI2S5Q5PXlqfT_cwkV0GCvc'
  const serverKey = 'AAAApHgAnUM:APA91bGtlcRkEPXTwhUpxEHbU6qyafHTcZoH_elqjsIIii9KNICsDvhX7nLFLb_rQaXhXLUCkUon5oKe8ELxGizFSoo5-ZlhelBEmJyLHX0-DsPLDRTuzxfUvPS9nD4A0F4Eg_xa_qtZ'

  var nameEle = $("#name");
  var avatarEle = $("#avatar");
  var timeRemainingEle = $("#time-remaining");

  var initLatLng = [0, 0];
  var zoom = 14;
  var marker = null;
  var layer = null;
  var countdownInterval = null;

  var map = L.map("map").setView(initLatLng, zoom);
  layer = L.tileLayer('https://tile.osm.ch/switzerland/{z}/{x}/{y}.png', {
    minZoom: 0,
    maxZoom: 19,
  });

  layer.addTo(map);
  map.on("zoomend", function () {
    zoom = map.getZoom();
  });

  firebase.initializeApp(firebaseConfig);
  const messaging = firebase.messaging();
  Notification.requestPermission().then((permission) => {
    if (permission === 'granted') {
      messaging.getToken({ vapidKey: publicKey }).then((currentToken) => {
        if (currentToken) {
          // console.log('currentToken: ', currentToken)
          subscribeTokenToTopic(currentToken, userId)
        } else {
          console.log('No registration token available. Request permission to generate one.');
        }
      }).catch((err) => {
        console.log('An error occurred while retrieving token. ', err);
      });
    }
  })

  messaging.onMessage((payload) => {
    console.log('Message received: ', payload);
    let data = {
      ...payload.data,
      ...{ 
        "latestPosition": {
          "latitude": payload.data.latitude,
          "longitude": payload.data.longitude,
        },
        "duration": 170000,
        "startTime": 1698410285,
        "avatarImageId": payload.data.avatar,
      }
    }

    updateUI(data);
  });

  $("body").on("click", "#btn-get", function (e) {
    e.preventDefault();
    getLocation();
  });

  getLocation();
  function getLocation() {
    $.ajax({
      url: apiUrl,
      method: "GET",
      dataType: "JSON",
      contentType: false,
      cache: false,
      processData: false,
      success: function (res) {
        console.log("getLocation() api", res);
        updateUI(res.data)
      },
      error: function (err) {
        const error = err.responseJSON
        if (error.code == 400 || error.error == 'INVALID_INPUT' || error.error == 'DATA_NOT_FOUND') {
          console.log('Error 400', error)
          clearInterval(countdownInterval);
          timeRemainingEle.text("Expired!");
          // window.location.href =  host + '/404'
        }
        if (error.error == 'LIVE_TRACKING_TIMEOUT') {
          console.log("The shared location is expired now.");
          clearInterval(countdownInterval);
          timeRemainingEle.text("Expired!");
          // window.location.href =  host + '/404'
        }
      },
    });
  }

  function updateUI(data) {
    nameEle.text(data.userName);
    avatarEle.attr("src", data.avatarImageId);
    const velocity = data.velocity ?? 0
    let htmlIcon = `<div class="mr-maker">`;
    htmlIcon += `<div class="vector">
                    <img src="/images/vector.png" />
                    <span>`+ velocity + `km/h</span>
                </div>`;
    htmlIcon += `<div class="avatar-marker">
                    <div>
                        <img src="`+ data.avatarImageId + `"/>
                    </div>
                </div>`;
    if (data.batteryLevel && data.batteryLevel > 0) {
      if (data.batteryLevel >= 20) {
        htmlIcon += `<div class="battery">
                        <img src="/images/battery-green.png" />
                        <span>`+ data.batteryLevel + `%</span>
                    </div>`;
      } else {
        htmlIcon += `<div class="battery">
                        <img src="/images/battery-red.png" />
                        <span>`+ data.batteryLevel + `%</span>
                    </div>`;
      }
    }
    htmlIcon += `</div>`;

    const position = data.latestPosition;
    const LatLng = [
      position.latitude,
      position.longitude,
    ];
    map.setView(LatLng, zoom);

    if (marker) {
      marker.setLatLng(LatLng).setIcon(L.divIcon({ html: htmlIcon }));
    } else {
      marker = L.marker(LatLng, {
        icon: L.divIcon({ html: htmlIcon }),
      }).addTo(map);
    }

    const now = Date.now();
    const expiredAt = parseFloat(data.startTime + data.duration) * 1000; // unix time to js time
    if (now >= expiredAt) {
      console.log("The shared location is expired now.");
      timeRemainingEle.text("Expired!");
    } else {
      const timeleft = expiredAt - now; // miliseconds

      const msPerSecond = 1000;
      const msPerMinute = msPerSecond * 60;
      const msPerHour = msPerMinute * 60;

      const hours = String(
        Math.floor(
          (timeleft % (1000 * 60 * 60 * 24)) / msPerHour
        )
      ).padStart(2, "0");
      const minutes = String(
        Math.floor((timeleft % (1000 * 60 * 60)) / msPerMinute)
      ).padStart(2, "0");
      const seconds = String(
        Math.floor((timeleft % (1000 * 60)) / msPerSecond)
      ).padStart(2, "0");

      clearInterval(countdownInterval);
      countdown(hours, minutes, seconds, timeRemainingEle)
    }
  }

  function countdown(hr, mm, ss, element) {
    countdownInterval = setInterval(function () {
      if (hr == 0 && mm == 0 && ss == 0) clearInterval(countdownInterval);
      ss--;
      if (ss == 0) {
        ss = 59;
        mm--;
        if (mm == 0) {
          mm = 59;
          hr--;
        }
      }

      if (hr.toString().length < 2) hr = "0" + hr;
      if (mm.toString().length < 2) mm = "0" + mm;
      if (ss.toString().length < 2) ss = "0" + ss;
      element.html("Expired in " + hr + ":" + mm + ":" + ss);
    }, 1000)
  }

  function subscribeTokenToTopic(token, topic) {
    fetch(`https://iid.googleapis.com/iid/v1/${token}/rel/topics/${topic}`, {
      method: 'POST',
      headers: new Headers({
        Authorization: `key=${serverKey}`
      })
    })
      .then((response) => {
        if (response.status < 200 || response.status >= 400) {
          console.log(response.status, response);
        }
        console.log(`"${topic}" is subscribed.`);
      })
      .catch((error) => {
        console.error(error.result);
      });
    return true;
  }

});
