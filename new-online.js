//25.11.2022 Fix parse date

(function () {
  'use strict';

  function videocdn(component, _object) {
    var network = new Lampa.Reguest();
    var extract = {};
    var results = [];
    var object = _object;
    var get_links_wait = false;
    var filter_items = {};
    var choice = {
      season: 0,
      voice: 0,
      voice_name: ''
    };

    this.search = function (_object, data) {
      object = _object;
      get_links_wait = true;
      var url = component.proxy('videocdn') + 'http://cdn.svetacdn.in/api/';
      var itm = data[0];
      if (!itm.iframe_src) return component.doesNotAnswer();
      var type = itm.iframe_src.split('/').slice(-2)[0];
      if (type == 'movie') type = 'movies';
      url += type;
      url = Lampa.Utils.addUrlComponent(url, 'api_token=3i40G5TSECmLF77oAqnEgbx61ZWaOYaE');
      url = Lampa.Utils.addUrlComponent(url, itm.imdb_id ? 'imdb_id=' + encodeURIComponent(itm.imdb_id) : 'title=' + encodeURIComponent(itm.title));
      url = Lampa.Utils.addUrlComponent(url, 'field=' + encodeURIComponent('global'));
      network.silent(url, function (found) {
        results = found.data.filter(function (elem) {
          return elem.id == itm.id;
        });
        if (!results.length) component.doesNotAnswer();else {
          try {
            success(results);
          } catch (e) {
            component.doesNotAnswer();
          }
        }
        component.loading(false);
      }, function (a, c) {
        component.doesNotAnswer();
      });
    };

    this.extendChoice = function (saved) {
      Lampa.Arrays.extend(choice, saved, true);
    };

    this.reset = function () {
      component.reset();
      choice = {
        season: 0,
        voice: 0,
        voice_name: ''
      };
      filter();
      append(filtred());
    };

    this.filter = function (type, a, b) {
      choice[a.stype] = b.index;

      if (a.stype == 'voice') {
        choice.voice_name = filter_items.voice[b.index];
      }

      component.reset();
      filter();
      append(filtred());
    };

    this.destroy = function () {
      network.clear();
      results = null;
    };

    function success(json) {
      results = json;
      extractData(json);
      filter();
      append(filtred());
    }

    function extractItems(str, max_quality) {
      try {
        var items = str.split(',').map(function (item) {
          return {
            quality: parseInt(item.match(/\[(\d+)p\]/)[1]),
            file: 'http:' + item.replace(/\[\d+p\]/, '').split(' or ')[0]
          };
        }).filter(function (item) {
          return item.quality <= max_quality;
        });
        items.sort(function (a, b) {
          return b.quality - a.quality;
        });
        return items;
      } catch (e) {}

      return [];
    }

    function extractData(results) {
      network.timeout(20000);
      var movie = results.slice(0, 1)[0];
      extract = {};

      if (movie) {
        var src = movie.iframe_src;
        network["native"]('http:' + src, function (raw) {
          get_links_wait = false;
          component.render().find('.online-prestige__scan-file').remove();
          var math = raw.replace(/\n/g, '').match(/id="files" value="(.*?)"/);

          if (math) {
            var json = Lampa.Arrays.decodeJson(math[1].replace(/&quot;/g, '"'), {});
            var text = document.createElement("textarea");

            var _loop = function _loop(i) {
              var _movie$media, _movie$media$filter$;

              if (0 === i - 0) {
                return "continue";
              }

              text.innerHTML = json[i];
              Lampa.Arrays.decodeJson(text.value, {});
              var max_quality = (_movie$media = movie.media) === null || _movie$media === void 0 ? void 0 : (_movie$media$filter$ = _movie$media.filter(function (obj) {
                return obj.translation_id === i - 0;
              })[0]) === null || _movie$media$filter$ === void 0 ? void 0 : _movie$media$filter$.max_quality;

              if (!max_quality) {
                var _movie$translations, _movie$translations$f;

                max_quality = (_movie$translations = movie.translations) === null || _movie$translations === void 0 ? void 0 : (_movie$translations$f = _movie$translations.filter(function (obj) {
                  return obj.id === i - 0;
                })[0]) === null || _movie$translations$f === void 0 ? void 0 : _movie$translations$f.max_quality;
              }

              extract[i] = {
                json: Lampa.Arrays.decodeJson(text.value, {}),
                items: extractItems(json[i], max_quality)
              };

              for (var a in extract[i].json) {
                var elem = extract[i].json[a];

                if (elem.folder) {
                  for (var f in elem.folder) {
                    var folder = elem.folder[f];
                    folder.items = extractItems(folder.file, max_quality);
                  }
                } else elem.items = extractItems(elem.file, max_quality);
              }
            };

            for (var i in json) {
              var _ret = _loop(i);

              if (_ret === "continue") continue;
            }
          }
        }, function () {
          get_links_wait = false;
          component.render().find('.online-prestige__scan-file').remove();
        }, false, {
          dataType: 'text'
        });
      }
    }

    function getFile(element, max_quality) {
      var translat = extract[element.translation];
      var id = element.season + '_' + element.episode;
      var file = '';
      var items = [];
      var quality = false;

      if (translat) {
        if (element.season) {
          for (var i in translat.json) {
            var elem = translat.json[i];

            if (elem.folder) {
              for (var f in elem.folder) {
                var folder = elem.folder[f];

                if (folder.id == id) {
                  items = folder.items;
                  break;
                }
              }
            } else if (elem.id == id) {
              items = elem.items;
              break;
            }
          }
        } else {
          items = translat.items;
        }
      }

      max_quality = parseInt(max_quality);

      if (items && items.length) {
        quality = {};
        var mass = [1080, 720, 480, 360];
        mass = mass.slice(mass.indexOf(max_quality));
        mass.forEach(function (n) {
          var exes = items.find(function (a) {
            return a.quality == n;
          });

          if (exes) {
            if (!file) file = exes.file;
            quality[n + 'p'] = exes.file;
          }
        });
        var preferably = Lampa.Storage.get('video_quality_default', '1080') + 'p';
        if (quality[preferably]) file = quality[preferably];
      }

      return {
        file: file,
        quality: quality
      };
    }

    function filter() {
      filter_items = {
        season: [],
        voice: [],
        voice_info: []
      };
      results.slice(0, 1).forEach(function (movie) {
        if (movie.season_count) {
          var s = movie.season_count;

          while (s--) {
            filter_items.season.push(Lampa.Lang.translate('torrent_serial_season') + ' ' + (movie.season_count - s));
          }
        }

        if (filter_items.season.length) {
          movie.episodes.forEach(function (episode) {
            if (episode.season_num == choice.season + 1) {
              episode.media.forEach(function (media) {
                if (!filter_items.voice_info.find(function (v) {
                  return v.id == media.translation.id;
                })) {
                  filter_items.voice.push(media.translation.shorter_title);
                  filter_items.voice_info.push({
                    id: media.translation.id
                  });
                }
              });
            }
          });
        }
      });

      if (choice.voice_name) {
        var inx = filter_items.voice.map(function (v) {
          return v.toLowerCase();
        }).indexOf(choice.voice_name.toLowerCase());
        if (inx == -1) choice.voice = 0;else if (inx !== choice.voice) {
          choice.voice = inx;
        }
      }

      component.filter(filter_items, choice);
    }

    function filtred() {
      var filtred = [];

      if (object.movie.name) {
        results.slice(0, 1).forEach(function (movie) {
          movie.episodes.forEach(function (episode) {
            if (episode.season_num == choice.season + 1) {
              var temp = episode.media.map(function (m) {
                return m;
              });
              var unique = [];
              temp.sort(function (a, b) {
                return b.max_quality - a.max_quality;
              });
              temp.forEach(function (m) {
                if (!unique.find(function (a) {
                  return a.translation.id == m.translation.id;
                })) {
                  unique.push(m);
                }
              });
              episode.media.forEach(function (media) {
                if (media.translation.id == filter_items.voice_info[choice.voice].id && unique.indexOf(media) !== -1) {
                  filtred.push({
                    episode: parseInt(episode.num),
                    season: episode.season_num,
                    title: episode.ru_title,
                    quality: (media.source_quality && window.innerWidth > 480 ? media.source_quality.toUpperCase() + ' - ' : '') + media.max_quality + 'p',
                    translation: media.translation_id,
                    info: filter_items.voice[choice.voice],
                    voice_name: filter_items.voice[choice.voice]
                  });
                }
              });
            }
          });
        });
      } else {
        results.slice(0, 1).forEach(function (movie) {
          movie.media.forEach(function (element) {
            filtred.push({
              title: element.translation.shorter_title,
              quality: (element.source_quality && window.innerWidth > 480 ? element.source_quality.toUpperCase() + ' - ' : '') + element.max_quality + 'p',
              translation: element.translation_id,
              voice_name: element.translation.shorter_title
            });
          });
        });
      }

      return filtred;
    }

    function toPlayElement(element) {
      var extra = getFile(element, element.quality);
      var play = {
        title: element.title,
        url: extra.file,
        quality: extra.quality,
        timeline: element.timeline,
        callback: element.mark
      };
      return play;
    }

    function append(items) {
      component.reset();
      component.draw(items, {
        onRender: function onRender(item, html) {
          if (get_links_wait) html.find('.online-prestige__body').append($('<div class="online-prestige__scan-file"><div class="broadcast__scan"><div></div></div></div>'));
        },
        onEnter: function onEnter(item, html) {
          var extra = getFile(item, item.quality);

          if (extra.file) {
            var playlist = [];
            var first = toPlayElement(item);

            if (item.season) {
              items.forEach(function (elem) {
                playlist.push(toPlayElement(elem));
              });
            } else {
              playlist.push(first);
            }

            if (playlist.length > 1) first.playlist = playlist;
            Lampa.Player.play(first);
            Lampa.Player.playlist(playlist);
            item.mark();
          } else Lampa.Noty.show(Lampa.Lang.translate(get_links_wait ? 'online_waitlink' : 'online_nolink'));
        },
        onContextMenu: function onContextMenu(item, html, data, call) {
          call(getFile(item, item.quality));
        }
      });
    }
  }

  function rezka(component, _object) {
    var network = new Lampa.Reguest();
    var extract = {};
    var embed = component.proxy('rezka') + 'https://voidboost.net/';
    var object = _object;
    var select_id = '';
    var filter_items = {};
    var choice = {
      season: 0,
      voice: 0,
      voice_name: ''
    };

    this.searchByKinopoisk = function (_object, id) {
      object = _object;
      select_id = id;
      getFirstTranlate(id, function (voice) {
        getFilm(id, voice);
      });
    };

    this.searchByImdbID = function (_object, id) {
      object = _object;
      select_id = id;
      getFirstTranlate(id, function (voice) {
        getFilm(id, voice);
      });
    };

    this.extendChoice = function (saved) {
      Lampa.Arrays.extend(choice, saved, true);
    };

    this.reset = function () {
      component.reset();
      choice = {
        season: 0,
        voice: 0,
        voice_name: ''
      };
      component.loading(true);
      getFilm(select_id);
      component.saveChoice(choice);
    };

    this.filter = function (type, a, b) {
      choice[a.stype] = b.index;
      if (a.stype == 'voice') choice.voice_name = filter_items.voice[b.index];
      component.reset();
      filter();
      component.loading(true);
      getFilm(select_id, extract.voice[choice.voice].token);
      component.saveChoice(choice);
      setTimeout(component.closeFilter, 10);
    };

    this.destroy = function () {
      network.clear();
      extract = null;
    };

    function getSeasons(voice, call) {
      var url = embed + 'serial/' + voice + '/iframe?h=gidonline.io';
      network.clear();
      network.timeout(10000);
      network["native"](url, function (str) {
        extractData(str);
        call();
      }, function (a, c) {
        component.doesNotAnswer();
      }, false, {
        dataType: 'text'
      });
    }

    function getFirstTranlate(id, call) {
      network.clear();
      network.timeout(10000);
      network["native"](embed + 'embed/' + id + '?s=1', function (str) {
        extractData(str);
        if (extract.voice.length) call(extract.voice[0].token);else component.doesNotAnswer();
      }, function (a, c) {
        component.doesNotAnswer();
      }, false, {
        dataType: 'text'
      });
    }

    function getEmbed(url) {
      network.clear();
      network.timeout(10000);
      network["native"](url, function (str) {
        component.loading(false);
        extractData(str);
        filter();
        append();
      }, function (a, c) {
        component.doesNotAnswer();
      }, false, {
        dataType: 'text'
      });
    }

    function getFilm(id, voice) {
      network.clear();
      network.timeout(10000);
      var url = embed;

      if (voice) {
        if (extract.season.length) {
          var ses = extract.season[Math.min(extract.season.length - 1, choice.season)].id;
          url += 'serial/' + voice + '/iframe?s=' + ses + '&h=gidonline.io';
          return getSeasons(voice, function () {
            var check = extract.season.filter(function (s) {
              return s.id == ses;
            });

            if (!check.length) {
              choice.season = extract.season.length - 1;
              url = embed + 'serial/' + voice + '/iframe?s=' + extract.season[Math.min(extract.season.length - 1, choice.season)].id + '&h=gidonline.io';
            }

            getEmbed(url);
          });
        } else {
          url += 'movie/' + voice + '/iframe?h=gidonline.io';
          getEmbed(url);
        }
      } else {
        url += 'embed/' + id;
        url += '?s=1';
        getEmbed(url);
      }
    }

    function filter() {
      filter_items = {
        season: extract.season.map(function (v) {
          return v.name;
        }),
        voice: extract.season.length ? extract.voice.map(function (v) {
          return v.name;
        }) : []
      };

      if (choice.voice_name) {
        var inx = filter_items.voice.map(function (v) {
          return v.toLowerCase();
        }).indexOf(choice.voice_name.toLowerCase());
        if (inx == -1) choice.voice = 0;else if (inx !== choice.voice) {
          choice.voice = inx;
        }
      }

      if (!extract.season[choice.season]) choice.season = 0;
      component.filter(filter_items, choice);
    }

    function parseSubtitles(str) {
      var subtitle = str.match("subtitle': '(.*?)'");

      if (subtitle) {
        var index = -1;
        return subtitle[1].split(',').map(function (sb) {
          var sp = sb.split(']');
          index++;
          return {
            label: sp[0].slice(1),
            url: sp.pop(),
            index: index
          };
        });
      }
    }

    function getStream(element, call, error) {
      if (element.stream) return call(element.stream);
      var url = embed;

      if (element.season) {
        url += 'serial/' + extract.voice[choice.voice].token + '/iframe?s=' + element.season + '&e=' + element.episode + '&h=gidonline.io';
      } else {
        url += 'movie/' + element.voice.token + '/iframe?h=gidonline.io';
      }

      network.clear();
      network.timeout(3000);
      network["native"](url, function (str) {
        var videos = str.match("file': '(.*?)'");

        if (videos) {
          var video = decode(videos[1]),
              qused = '',
              first = '',
              mass = ['2160p', '1440p', '1080p Ultra', '1080p', '720p', '480p', '360p'];
          video = video.slice(1).split(/,\[/).map(function (s) {
            return s.split(']')[0] + ']' + (s.indexOf(' or ') > -1 ? s.split(' or').pop().trim() : s.split(']').pop());
          }).join('[');
          element.qualitys = {};
          var preferably = Lampa.Storage.get('video_quality_default', '1080');
          mass.forEach(function (n) {
            var link = video.match(new RegExp(n + "](.*?)mp4"));

            if (link) {
              if (!first) first = link[1] + 'mp4';
              element.qualitys[n] = link[1] + 'mp4';

              if (n.indexOf(preferably) >= 0) {
                qused = link[1] + 'mp4';
                first = qused;
              }
            }
          });
          if (!first) element.qualitys = false;

          if (first) {
            element.stream = qused || first;
            element.subtitles = parseSubtitles(str);
            call(element.stream);
          } else error();
        } else error();
      }, error, false, {
        dataType: 'text'
      });
    }

    function decode(data) {
      function product(iterables, repeat) {
        var argv = Array.prototype.slice.call(arguments),
            argc = argv.length;

        if (argc === 2 && !isNaN(argv[argc - 1])) {
          var copies = [];

          for (var i = 0; i < argv[argc - 1]; i++) {
            copies.push(argv[0].slice()); // Clone
          }

          argv = copies;
        }

        return argv.reduce(function tl(accumulator, value) {
          var tmp = [];
          accumulator.forEach(function (a0) {
            value.forEach(function (a1) {
              tmp.push(a0.concat(a1));
            });
          });
          return tmp;
        }, [[]]);
      }

      function unite(arr) {
        var _final = [];
        arr.forEach(function (e) {
          _final.push(e.join(""));
        });
        return _final;
      }

      var trashList = ["@", "#", "!", "^", "$"];
      var two = unite(product(trashList, 2));
      var tree = unite(product(trashList, 3));
      var trashCodesSet = two.concat(tree);
      var arr = data.replace("#h", "").split("//_//");
      var trashString = arr.join('');
      trashCodesSet.forEach(function (i) {
        trashString = trashString.replace(new RegExp(btoa(i), 'g'), '');
      });
      var result = '';

      try {
        result = atob(trashString.substr(2));
      } catch (e) {}

      return result;
    }

    function extractData(str) {
      extract.voice = [];
      extract.season = [];
      extract.episode = [];
      str = str.replace(/\n/g, '');
      var voices = str.match('<select name="translator"[^>]+>(.*?)</select>');
      var sesons = str.match('<select name="season"[^>]+>(.*?)</select>');
      var episod = str.match('<select name="episode"[^>]+>(.*?)</select>');

      if (sesons) {
        var select = $('<select>' + sesons[1] + '</select>');
        $('option', select).each(function () {
          extract.season.push({
            id: $(this).attr('value'),
            name: $(this).text()
          });
        });
      }

      if (voices) {
        var _select = $('<select>' + voices[1] + '</select>');

        $('option', _select).each(function () {
          var token = $(this).attr('data-token');

          if (token) {
            extract.voice.push({
              token: token,
              name: $(this).text(),
              id: $(this).val()
            });
          }
        });
      }

      if (episod) {
        var _select2 = $('<select>' + episod[1] + '</select>');

        $('option', _select2).each(function () {
          extract.episode.push({
            id: $(this).attr('value'),
            name: $(this).text()
          });
        });
      }
    }

    function append() {
      component.reset();
      var items = [];

      if (extract.season.length) {
        extract.episode.forEach(function (episode) {
          items.push({
            title: episode.name,
            quality: '720p ~ 1080p',
            season: extract.season[Math.min(extract.season.length - 1, choice.season)].id,
            episode: parseInt(episode.id),
            info: extract.voice[choice.voice].name,
            voice: extract.voice[choice.voice],
            voice_name: extract.voice[choice.voice].name
          });
        });
      } else {
        extract.voice.forEach(function (voice) {
          items.push({
            title: voice.name.length > 3 ? voice.name : object.movie.title,
            quality: '720p ~ 1080p',
            voice: voice,
            info: '',
            voice_name: voice.name
          });
        });
      }

      component.draw(items, {
        onEnter: function onEnter(item, html) {
          getStream(item, function (stream) {
            var first = {
              url: stream,
              timeline: item.timeline,
              quality: item.qualitys,
              title: item.title,
              subtitles: item.subtitles
            };
            Lampa.Player.play(first);

            if (item.season) {
              var playlist = [];
              items.forEach(function (elem) {
                var cell = {
                  url: function url(call) {
                    getStream(elem, function (stream) {
                      cell.url = stream;
                      cell.quality = elem.qualitys;
                      elem.mark();
                      call();
                    }, function () {
                      cell.url = '';
                      call();
                    });
                  },
                  timeline: elem.timeline,
                  title: elem.title,
                  subtitles: elem.subtitles
                };
                if (elem == item) cell.url = stream;
                playlist.push(cell);
              });
              Lampa.Player.playlist(playlist);
            } else {
              Lampa.Player.playlist([first]);
            }

            item.mark();
          }, function () {
            Lampa.Noty.show(Lampa.Lang.translate('online_nolink'));
          });
        },
        onContextMenu: function onContextMenu(item, html, data, call) {
          getStream(item, function (stream) {
            call({
              file: stream,
              quality: item.qualitys
            });
          });
        }
      });
    }
  }

  function kinobase(component, _object) {
    var network = new Lampa.Reguest();
    var extract = {};
    var embed = component.proxy('kinobase') + 'https://kinobase.org/';
    var object = _object;
    var select_title = '';
    var select_id = '';
    var is_playlist = false;
    var translation = '';
    var quality_type = '';
    var filter_items = {};
    var wait_similars;
    var choice = {
      season: 0,
      voice: -1
    };

    this.search = function (_object, sim) {
      if (wait_similars && sim) return getPage(sim[0].link);
    };

    this.searchByTitle = function (_object, query) {
      object = _object;
      select_title = query;
      var url = embed + "search?query=" + encodeURIComponent(cleanTitle(select_title));
      network["native"](url, function (str) {
        str = str.replace(/\n/, '');
        var links = object.movie.number_of_seasons ? str.match(/<a href="\/serial\/(.*?)">(.*?)<\/a>/g) : str.match(/<a href="\/film\/(.*?)" class="link"[^>]+>(.*?)<\/a>/g);
        var relise = object.search_date || (object.movie.number_of_seasons ? object.movie.first_air_date : object.movie.release_date) || '0000';
        var need_year = parseInt((relise + '').slice(0, 4));
        var found_url = '';

        if (links) {
          var cards = [];
          links.filter(function (l) {
            var link = $(l),
                titl = link.attr('title') || link.text() || '';
            var year = parseInt(titl.split('(').pop().slice(0, -1));
            if (year > need_year - 2 && year < need_year + 2) cards.push({
              year: year,
              title: titl.split(/\(\d{4}\)/)[0].trim(),
              link: link.attr('href')
            });
          });
          var card = cards.find(function (c) {
            return c.year == need_year;
          });
          if (!card) card = cards.find(function (c) {
            return c.title == select_title;
          });
          if (!card && cards.length == 1) card = cards[0];
          if (card) found_url = cards[0].link;
          if (found_url) getPage(found_url);else if (links.length) {
            wait_similars = true;
            var similars = [];
            links.forEach(function (l) {
              var link = $(l),
                  titl = link.attr('title') || link.text();
              similars.push({
                title: titl,
                link: link.attr('href'),
                filmId: 'similars'
              });
            });
            component.similars(similars);
            component.loading(false);
          } else component.doesNotAnswer();
        } else component.doesNotAnswer();
      }, function (a, c) {
        component.doesNotAnswer();
      }, false, {
        dataType: 'text'
      });
    };

    this.extendChoice = function (saved) {
      Lampa.Arrays.extend(choice, saved, true);
    };

    this.reset = function () {
      component.reset();
      choice = {
        season: 0,
        voice: -1
      };
      filter();
      append(filtred());
    };

    this.filter = function (type, a, b) {
      choice[a.stype] = b.index;
      component.reset();
      filter();
      append(filtred());
    };

    this.destroy = function () {
      network.clear();
      extract = null;
    };

    function cleanTitle(str) {
      return str.replace('.', '').replace(':', '');
    }

    function parsePlaylist(str) {
      var pl = [];

      try {
        if (str.charAt(0) === '[') {
          str.substring(1).split(',[').forEach(function (item) {
            var label_end = item.indexOf(']');

            if (label_end >= 0) {
              var label = item.substring(0, label_end);

              if (item.charAt(label_end + 1) === '{') {
                item.substring(label_end + 2).split(';{').forEach(function (voice_item) {
                  var voice_end = voice_item.indexOf('}');

                  if (voice_end >= 0) {
                    var voice = voice_item.substring(0, voice_end);
                    pl.push({
                      label: label,
                      voice: voice,
                      links: voice_item.substring(voice_end + 1).split(' or ')
                    });
                  }
                });
              } else {
                pl.push({
                  label: label,
                  links: item.substring(label_end + 1).split(' or ')
                });
              }
            }

            return null;
          });
        }
      } catch (e) {}

      return pl;
    }

    function filter() {
      filter_items = {
        season: [],
        voice: []
      };

      if (is_playlist) {
        extract.forEach(function (item, i) {
          if (item.playlist) {
            filter_items.season.push(item.comment);

            if (i == choice.season) {
              item.playlist.forEach(function (eps) {
                if (eps.file) {
                  parsePlaylist(eps.file).forEach(function (el) {
                    if (el.voice && filter_items.voice.indexOf(el.voice) == -1) {
                      filter_items.voice.push(el.voice);
                    }
                  });
                }
              });
            }
          } else if (item.file) {
            parsePlaylist(item.file).forEach(function (el) {
              if (el.voice && filter_items.voice.indexOf(el.voice) == -1) {
                filter_items.voice.push(el.voice);
              }
            });
          }
        });
      }

      if (!filter_items.season[choice.season]) choice.season = 0;
      if (!filter_items.voice[choice.voice]) choice.voice = 0;
      component.filter(filter_items, choice);
    }

    function filtred() {
      var filtred = [];

      if (is_playlist) {
        var playlist = extract;
        var season = object.movie.number_of_seasons && 1;

        if (extract[choice.season] && extract[choice.season].playlist) {
          playlist = extract[choice.season].playlist;
          season = parseInt(extract[choice.season].comment);
          if (isNaN(season)) season = 1;
        }

        playlist.forEach(function (eps, episode) {
          var items = extractItems(eps.file, filter_items.voice[choice.voice]);

          if (items.length) {
            var alt_voice = eps.comment.match(/\d+ ÑÐµÑ€Ð¸Ñ (.*)$/i);
            var info = items[0].voice || alt_voice && alt_voice[1].trim() || translation;
            if (info == eps.comment) info = '';
            filtred.push({
              file: eps.file,
              title: eps.comment,
              quality: (quality_type && window.innerWidth > 480 ? quality_type + ' - ' : '') + items[0].quality + 'p',
              season: season,
              episode: episode + 1,
              info: info,
              voice: items[0].voice,
              voice_name: info,
              subtitles: parseSubs(eps.subtitle || '')
            });
          }
        });
      } else {
        filtred = extract;
      }

      return filtred;
    }

    function extractItems(str, voice) {
      try {
        var list = parsePlaylist(str);

        if (voice) {
          var tmp = list.filter(function (el) {
            return el.voice == voice;
          });

          if (tmp.length) {
            list = tmp;
          } else {
            list = list.filter(function (el) {
              return typeof el.voice == 'undefined';
            });
          }
        }

        var items = list.map(function (item) {
          var quality = item.label.match(/(\d\d\d+)p/);
          return {
            label: item.label,
            voice: item.voice,
            quality: quality ? parseInt(quality[1]) : NaN,
            file: item.links[0]
          };
        });
        items.sort(function (a, b) {
          if (b.quality > a.quality) return 1;
          if (b.quality < a.quality) return -1;
          if (b.label > a.label) return 1;
          if (b.label < a.label) return -1;
          return 0;
        });
        return items;
      } catch (e) {}

      return [];
    }

    function parseSubs(vod) {
      var subtitles = [];
      vod.split(',').forEach(function (s) {
        var nam = s.match("\\[(.*?)]");

        if (nam) {
          var url = s.replace(/\[.*?\]/, '').split(' or ')[0];

          if (url) {
            subtitles.push({
              label: nam[1],
              url: url
            });
          }
        }
      });
      return subtitles.length ? subtitles : false;
    }

    function extractData(str, page) {
      var quality_match = page.match(/<li><b>ÐšÐ°Ñ‡ÐµÑÑ‚Ð²Ð¾:<\/b>([^<,]+)<\/li>/i);
      var translation_match = page.match(/<li><b>ÐŸÐµÑ€ÐµÐ²Ð¾Ð´:<\/b>([^<,]+)<\/li>/i);
      quality_type = quality_match ? quality_match[1].trim() : '';
      translation = translation_match ? translation_match[1].trim() : '';
      var vod = str.split('|');

      if (vod[0] == 'file') {
        var file = vod[1];
        var found = [];
        var subtiles = parseSubs(vod[2]);

        if (file) {
          var voices = {};
          parsePlaylist(file).forEach(function (item) {
            var prev = voices[item.voice || ''];
            var quality_str = item.label.match(/(\d\d\d+)p/);
            var quality = quality_str ? parseInt(quality_str[1]) : NaN;

            if (!prev || quality > prev.quality) {
              voices[item.voice || ''] = {
                quality: quality
              };
            }
          });

          for (var voice in voices) {
            var el = voices[voice];
            found.push({
              file: file,
              title: voice || translation || object.movie.title,
              quality: (quality_type && window.innerWidth > 480 ? quality_type + ' - ' : '') + el.quality + 'p',
              info: '',
              voice: voice,
              subtitles: subtiles,
              voice_name: voice || translation || ''
            });
          }
        }

        extract = found;
        is_playlist = false;
      } else if (vod[0] == 'pl') {
        extract = Lampa.Arrays.decodeJson(vod[1], []);
        is_playlist = true;
      } else component.emptyForQuery(select_title);
    }

    function getPage(url) {
      network.clear();
      network.timeout(1000 * 10);
      network["native"](embed + url, function (str) {
        str = str.replace(/\n/g, '');
        var MOVIE_ID = str.match('var MOVIE_ID = ([^;]+);');
        var IDENTIFIER = str.match('var IDENTIFIER = "([^"]+)"');
        var PLAYER_CUID = str.match('var PLAYER_CUID = "([^"]+)"');

        if (MOVIE_ID && IDENTIFIER && PLAYER_CUID) {
          select_id = MOVIE_ID[1];
          var identifier = IDENTIFIER[1];
          var player_cuid = PLAYER_CUID[1];
          var data_url = "user_data";
          data_url = Lampa.Utils.addUrlComponent(data_url, "page=movie");
          data_url = Lampa.Utils.addUrlComponent(data_url, "movie_id=" + select_id);
          data_url = Lampa.Utils.addUrlComponent(data_url, "cuid=" + player_cuid);
          data_url = Lampa.Utils.addUrlComponent(data_url, "device=DESKTOP");
          data_url = Lampa.Utils.addUrlComponent(data_url, "_=" + Date.now());
          network.clear();
          network.timeout(1000 * 10);
          network["native"](embed + data_url, function (user_data) {
            if (typeof user_data.vod_hash == "string") {
              var file_url = "vod/" + select_id;
              file_url = Lampa.Utils.addUrlComponent(file_url, "identifier=" + identifier);
              file_url = Lampa.Utils.addUrlComponent(file_url, "player_type=new");
              file_url = Lampa.Utils.addUrlComponent(file_url, "file_type=mp4");
              file_url = Lampa.Utils.addUrlComponent(file_url, "st=" + user_data.vod_hash);
              file_url = Lampa.Utils.addUrlComponent(file_url, "e=" + user_data.vod_time);
              file_url = Lampa.Utils.addUrlComponent(file_url, "_=" + Date.now());
              network.clear();
              network.timeout(1000 * 10);
              network["native"](embed + file_url, function (files) {
                component.loading(false);
                extractData(files, str);
                filter();
                append(filtred());
              }, function (a, c) {
                component.doesNotAnswer();
              }, false, {
                dataType: 'text'
              });
            } else component.doesNotAnswer(L);
          }, function (a, c) {
            component.doesNotAnswer();
          });
        } else component.doesNotAnswer();
      }, function (a, c) {
        component.doesNotAnswer();
      }, false, {
        dataType: 'text'
      });
    }

    function getFile(element) {
      var quality = {},
          first = '';
      var preferably = Lampa.Storage.get('video_quality_default', '1080');
      element.file.split(',').reverse().forEach(function (file) {
        var q = file.match("\\[(\\d+)p");

        if (q) {
          quality[q[1] + 'p'] = file.replace(/\[\d+p\]/, '').replace(/{([^}]+)}/, '').split(' or ')[0];
          if (!first || q[1] == preferably) first = quality[q[1] + 'p'];
        }
      });
      element.stream = first;
      element.qualitys = quality;
      return {
        file: first,
        quality: quality
      };
    }

    function toPlayElement(element) {
      getFile(element);
      var play = {
        url: element.stream,
        timeline: element.timeline,
        title: element.title,
        subtitles: element.subtitles,
        quality: element.qualitys,
        callback: element.mark
      };
      return play;
    }

    function append(items) {
      component.reset();
      component.draw(items, {
        similars: wait_similars,
        onEnter: function onEnter(item, html) {
          getFile(item);

          if (item.stream) {
            var playlist = [];
            var first = toPlayElement(item);

            if (item.season) {
              items.forEach(function (elem) {
                playlist.push(toPlayElement(elem));
              });
            } else {
              playlist.push(first);
            }

            if (playlist.length > 1) first.playlist = playlist;
            Lampa.Player.play(first);
            Lampa.Player.playlist(playlist);
            item.mark();
          } else Lampa.Noty.show(Lampa.Lang.translate('online_nolink'));
        },
        onContextMenu: function onContextMenu(item, html, data, call) {
          call(getFile(item));
        }
      });
    }
  }

  function collaps(component, _object) {
    var network = new Lampa.Reguest();
    var extract = {};
    var embed = component.proxy('collaps') + 'https://api.delivembd.ws/embed/';
    var filter_items = {};
    var choice = {
      season: 0,
      voice: 0
    };

    this.searchByKinopoisk = function (_object, id) {
      this.searchIn('kp', id);
    };

    this.searchByImdbID = function (_object, id) {
      this.searchIn('imdb', id);
    };

    this.searchIn = function (where, id) {
      var url = embed + where + '/' + id;
      network.silent(url, function (str) {
        if (str) {
          parse(str);
        } else component.doesNotAnswer();

        component.loading(false);
      }, function (a, c) {
        component.doesNotAnswer();
      }, false, {
        dataType: 'text'
      });
    };

    this.extendChoice = function (saved) {
      Lampa.Arrays.extend(choice, saved, true);
    };

    this.reset = function () {
      component.reset();
      choice = {
        season: 0,
        voice: 0
      };
      filter();
      append(filtred());
      component.saveChoice(choice);
    };

    this.filter = function (type, a, b) {
      choice[a.stype] = b.index;
      component.reset();
      filter();
      append(filtred());
      component.saveChoice(choice);
    };

    this.destroy = function () {
      network.clear();
      extract = null;
    };

    function parse(str) {
      str = str.replace(/\n/g, '');
      var find = str.match('makePlayer\\({(.*?)}\\);');

      if (find) {
        var json;

        try {
          json = eval('({' + find[1] + '})');
        } catch (e) {}

        if (json) {
          extract = json;
          filter();
          append(filtred());
        } else component.doesNotAnswer();
      }
    }

    function filter() {
      filter_items = {
        season: [],
        voice: [],
        quality: []
      };

      if (extract.playlist) {
        if (extract.playlist.seasons) {
          extract.playlist.seasons.forEach(function (season) {
            filter_items.season.push(Lampa.Lang.translate('torrent_serial_season') + ' ' + season.season);
          });
        }
      }

      filter_items.season.sort(function (a, b) {
        var n_a = parseInt(a.replace(/\D/g, ''));
        var n_b = parseInt(b.replace(/\D/g, ''));
        if (n_a > n_b) return 1;else if (n_a < n_b) return -1;else return 0;
      });
      component.filter(filter_items, choice);
    }

    function filtred() {
      var filtred = [];

      if (extract.playlist) {
        extract.playlist.seasons.forEach(function (season, i) {
          if (season.season - 1 == choice.season) {
            season.episodes.forEach(function (episode) {
              filtred.push({
                file: episode.hls,
                episode: parseInt(episode.episode),
                season: season.season,
                title: episode.title,
                quality: '',
                info: episode.audio.names.slice(0, 5).join(', '),
                subtitles: episode.cc ? episode.cc.map(function (c) {
                  return {
                    label: c.name,
                    url: c.url
                  };
                }) : false
              });
            });
          }
        });
      } else if (extract.source) {
        var resolution = Lampa.Arrays.getKeys(extract.qualityByWidth).pop();
        var max_quality = extract.qualityByWidth ? extract.qualityByWidth[resolution] || 0 : 0;
        filtred.push({
          file: extract.source.hls,
          title: extract.title,
          quality: max_quality ? max_quality + 'p' : '',
          info: extract.source.audio.names.slice(0, 4).join(', '),
          subtitles: extract.source.cc ? extract.source.cc.map(function (c) {
            return {
              label: c.name,
              url: c.url
            };
          }) : false
        });
      }

      return filtred;
    }

    function append(items) {
      component.reset();
      component.draw(items, {
        onEnter: function onEnter(item, html) {
          if (item.file) {
            var playlist = [];
            var first = {
              url: item.file,
              timeline: item.timeline,
              title: item.title,
              subtitles: item.subtitles
            };

            if (item.season) {
              items.forEach(function (elem) {
                playlist.push({
                  title: elem.title,
                  url: elem.file,
                  timeline: elem.timeline,
                  subtitles: elem.subtitles,
                  callback: function callback() {
                    elem.mark();
                  }
                });
              });
            } else {
              playlist.push(first);
            }

            if (playlist.length > 1) first.playlist = playlist;
            Lampa.Player.play(first);
            Lampa.Player.playlist(playlist);
            item.mark();
          } else Lampa.Noty.show(Lampa.Lang.translate('online_nolink'));
        },
        onContextMenu: function onContextMenu(item, html, data, call) {
          call({
            file: item.file
          });
        }
      });
    }
  }

  function filmix(component, _object) {
    var network = new Lampa.Reguest();
    var extract = {};
    var results = [];
    var object = _object;
    var embed = 'http://filmixapp.cyou/api/v2/';
    var wait_similars;
    var filter_items = {};
    var choice = {
      season: 0,
      voice: 0,
      voice_name: ''
    };
    var token = Lampa.Storage.get('filmix_token', '');

    if (!window.filmix) {
window.filmix = {
  max_qualitie: 480,
  is_max_qualitie: false
};
}
else{
if(window.filmix.max_qualitie == 720) window.filmix.max_qualitie = 480
}

    var dev_token = 'user_dev_apk=2.0.1&user_dev_id=&user_dev_name=Xiaomi&user_dev_os=11&user_dev_token=' + token + '&user_dev_vendor=Xiaomi';

    this.search = function (_object, sim) {
      if (wait_similars) this.find(sim[0].id);
    };

    this.searchByTitle = function (_object, query) {
      var _this = this;

      object = _object;
      var year = parseInt((object.movie.release_date || object.movie.first_air_date || '0000').slice(0, 4));
      var orig = object.movie.original_title || object.movie.original_name;
      var url = embed + 'search';
      url = Lampa.Utils.addUrlComponent(url, 'story=' + encodeURIComponent(query));
      url = Lampa.Utils.addUrlComponent(url, dev_token);
      network.clear();
      network.silent(url, function (json) {
        var cards = json.filter(function (c) {
          c.year = parseInt(c.alt_name.split('-').pop());
          return c.year > year - 2 && c.year < year + 2;
        });
        var card = cards.find(function (c) {
          return c.year == year;
        });

        if (!card) {
          card = cards.find(function (c) {
            return c.original_title == orig;
          });
        }

        if (!card && cards.length == 1) card = cards[0];
        if (card) _this.find(card.id);else if (json.length) {
          wait_similars = true;
          component.similars(json);
          component.loading(false);
        } else component.doesNotAnswer();
      }, function (a, c) {
        component.doesNotAnswer();
      });
    };

    this.find = function (filmix_id) {
      var url = embed;

      if (!window.filmix.is_max_qualitie && token) {
        window.filmix.is_max_qualitie = true;
        network.clear();
        network.timeout(10000);
        network.silent(url + 'user_profile?' + dev_token, function (found) {
          if (found && found.user_data) {
            if (found.user_data.is_pro) window.filmix.max_qualitie = 1080;
            if (found.user_data.is_pro_plus) window.filmix.max_qualitie = 2160;
          }

          end_search(filmix_id);
        });
      } else end_search(filmix_id);

      function end_search(filmix_id) {
        network.clear();
        network.timeout(10000);
        network.silent((window.filmix.is_max_qualitie ? url + 'post/' + filmix_id : url + 'post/' + filmix_id) + '?' + dev_token, function (found) {
          if (found && Object.keys(found).length) {
            success(found);
            component.loading(false);
          } else component.doesNotAnswer();
        }, function (a, c) {
          component.doesNotAnswer();
        });
      }
    };

    this.extendChoice = function (saved) {
      Lampa.Arrays.extend(choice, saved, true);
    };

    this.reset = function () {
      component.reset();
      choice = {
        season: 0,
        voice: 0,
        voice_name: ''
      };
      extractData(results);
      filter();
      append(filtred());
    };

    this.filter = function (type, a, b) {
      choice[a.stype] = b.index;
      if (a.stype == 'voice') choice.voice_name = filter_items.voice[b.index];
      component.reset();
      extractData(results);
      filter();
      append(filtred());
    };

    this.destroy = function () {
      network.clear();
      results = null;
    };

    function success(json) {
      results = json;
      extractData(json);
      filter();
      append(filtred());
    }

    function extractData(data) {
      extract = {};
      var pl_links = data.player_links;

      if (pl_links.playlist && Object.keys(pl_links.playlist).length > 0) {
        var seas_num = 0;

        for (var season in pl_links.playlist) {
          var episode = pl_links.playlist[season];
          ++seas_num;
          var transl_id = 0;

          for (var voice in episode) {
            var episode_voice = episode[voice];
            ++transl_id;
            var items = [];

            for (var ID in episode_voice) {
              var file_episod = episode_voice[ID];
              var quality_eps = file_episod.qualities.filter(function (qualitys) {
                return qualitys <= window.filmix.max_qualitie;
              });
              var max_quality = Math.max.apply(null, quality_eps);
              var stream_url = file_episod.link.replace('%s.mp4', max_quality + '.mp4');
              var s_e = stream_url.slice(0 - stream_url.length + stream_url.lastIndexOf('/'));
              var str_s_e = s_e.match(/s(\d+)e(\d+?)_\d+\.mp4/i);

              if (str_s_e) {
                var _seas_num = parseInt(str_s_e[1]);

                var _epis_num = parseInt(str_s_e[2]);

                items.push({
                  id: _seas_num + '_' + _epis_num,
                  comment: _epis_num + ' ' + Lampa.Lang.translate('torrent_serial_episode') + ' <i>' + ID + '</i>',
                  file: stream_url,
                  episode: _epis_num,
                  season: _seas_num,
                  quality: max_quality,
                  qualities: quality_eps,
                  translation: transl_id
                });
              }
            }

            if (!extract[transl_id]) extract[transl_id] = {
              json: [],
              file: ''
            };
            extract[transl_id].json.push({
              id: seas_num,
              comment: seas_num + ' ' + Lampa.Lang.translate('torrent_serial_season'),
              folder: items,
              translation: transl_id
            });
          }
        }
      } else if (pl_links.movie && pl_links.movie.length > 0) {
        var _transl_id = 0;

        for (var _ID in pl_links.movie) {
          var _file_episod = pl_links.movie[_ID];
          ++_transl_id;

          var _quality_eps = _file_episod.link.match(/.+\[(.+[\d]),?\].+/i);

          if (_quality_eps) _quality_eps = _quality_eps[1].split(',').filter(function (quality_) {
            return quality_ <= window.filmix.max_qualitie;
          });

          var _max_quality = Math.max.apply(null, _quality_eps);

          var file_url = _file_episod.link.replace(/\[(.+[\d]),?\]/i, _max_quality);

          extract[_transl_id] = {
            file: file_url,
            translation: _file_episod.translation,
            quality: _max_quality,
            qualities: _quality_eps
          };
        }
      }
    }

    function getFile(element, max_quality) {
      var translat = extract[element.translation];
      var id = element.season + '_' + element.episode;
      var file = '';
      var quality = false;

      if (translat) {
        if (element.season) for (var i in translat.json) {
          var elem = translat.json[i];
          if (elem.folder) for (var f in elem.folder) {
            var folder = elem.folder[f];

            if (folder.id == id) {
              file = folder.file;
              break;
            }
          } else {
            if (elem.id == id) {
              file = elem.file;
              break;
            }
          }
        } else file = translat.file;
      }

      max_quality = parseInt(max_quality);

      if (file) {
        var link = file.slice(0, file.lastIndexOf('_')) + '_';
        var orin = file.split('?');
        orin = orin.length > 1 ? '?' + orin.slice(1).join('?') : '';

        if (file.split('_').pop().replace('.mp4', '') !== max_quality) {
          file = link + max_quality + '.mp4' + orin;
        }

        quality = {};
        var mass = [2160, 1440, 1080, 720, 480, 360];
        mass = mass.slice(mass.indexOf(max_quality));
        mass.forEach(function (n) {
          quality[n + 'p'] = link + n + '.mp4' + orin;
        });
        var preferably = Lampa.Storage.get('video_quality_default', '1080') + 'p';
        if (quality[preferably]) file = quality[preferably];
      }

      return {
        file: file,
        quality: quality
      };
    }

    function filter() {
      filter_items = {
        season: [],
        voice: [],
        voice_info: []
      };

      if (results.last_episode && results.last_episode.season) {
        var s = results.last_episode.season;

        while (s--) {
          filter_items.season.push(Lampa.Lang.translate('torrent_serial_season') + ' ' + (results.last_episode.season - s));
        }
      }

      for (var Id in results.player_links.playlist) {
        var season = results.player_links.playlist[Id];
        var d = 0;

        for (var voic in season) {
          ++d;

          if (filter_items.voice.indexOf(voic) == -1) {
            filter_items.voice.push(voic);
            filter_items.voice_info.push({
              id: d
            });
          }
        }
      }

      if (choice.voice_name) {
        var inx = filter_items.voice.map(function (v) {
          return v.toLowerCase();
        }).indexOf(choice.voice_name.toLowerCase());
        if (inx == -1) choice.voice = 0;else if (inx !== choice.voice) {
          choice.voice = inx;
        }
      }

      component.filter(filter_items, choice);
    }

    function filtred() {
      var filtred = [];

      if (Object.keys(results.player_links.playlist).length) {
        for (var transl in extract) {
          var element = extract[transl];

          for (var season_id in element.json) {
            var episode = element.json[season_id];

            if (episode.id == choice.season + 1) {
              episode.folder.forEach(function (media) {
                if (media.translation == filter_items.voice_info[choice.voice].id) {
                  filtred.push({
                    episode: parseInt(media.episode),
                    season: media.season,
                    title: Lampa.Lang.translate('torrent_serial_episode') + ' ' + media.episode + (media.title ? ' - ' + media.title : ''),
                    quality: media.quality + 'p ',
                    translation: media.translation,
                    voice_name: filter_items.voice[choice.voice],
                    info: filter_items.voice[choice.voice]
                  });
                }
              });
            }
          }
        }
      } else if (Object.keys(results.player_links.movie).length) {
        for (var transl_id in extract) {
          var _element = extract[transl_id];
          filtred.push({
            title: _element.translation,
            quality: _element.quality + 'p ',
            qualitys: _element.qualities,
            translation: transl_id,
            voice_name: _element.translation
          });
        }
      }

      return filtred;
    }

    function toPlayElement(element) {
      var extra = getFile(element, element.quality);
      var play = {
        title: element.title,
        url: extra.file,
        quality: extra.quality,
        timeline: element.timeline,
        callback: element.mark
      };
      return play;
    }

    function append(items) {
      component.reset();
      component.draw(items, {
        similars: wait_similars,
        onEnter: function onEnter(item, html) {
          var extra = getFile(item, item.quality);

          if (extra.file) {
            var playlist = [];
            var first = toPlayElement(item);

            if (item.season) {
              items.forEach(function (elem) {
                playlist.push(toPlayElement(elem));
              });
            } else {
              playlist.push(first);
            }

            if (playlist.length > 1) first.playlist = playlist;
            Lampa.Player.play(first);
            Lampa.Player.playlist(playlist);
            item.mark();
          } else Lampa.Noty.show(Lampa.Lang.translate('online_nolink'));
        },
        onContextMenu: function onContextMenu(item, html, data, call) {
          call(getFile(item, item.quality));
        }
      });
    }
  }

  function component(object) {
    var network = new Lampa.Reguest();
    var scroll = new Lampa.Scroll({
      mask: true,
      over: true
    });
    var files = new Lampa.Explorer(object);
    var filter = new Lampa.Filter(object);
    var sources = {
      videocdn: videocdn,
      rezka: rezka,
      kinobase: kinobase,
      collaps: collaps,
      filmix: filmix
    };
    var last;
    var extended;
    var selected_id;
    var source;
    var balanser;
    var initialized;
    var balanser_timer;
    var images = [];
    var filter_sources = Lampa.Arrays.getKeys(sources);
    var filter_translate = {
      season: Lampa.Lang.translate('torrent_serial_season'),
      voice: Lampa.Lang.translate('torrent_parser_voice'),
      source: Lampa.Lang.translate('settings_rest_source')
    };

    this.initialize = function () {
      var _this = this;

      source = this.createSource();

      filter.onSearch = function (value) {
        Lampa.Activity.replace({
          search: value,
          clarification: true
        });
      };

      filter.onBack = function () {
        _this.start();
      };

      filter.render().find('.selector').on('hover:enter', function () {
        clearInterval(balanser_timer);
      });

      filter.onSelect = function (type, a, b) {
        if (type == 'filter') {
          if (a.reset) {
            if (extended) source.reset();else _this.start();
          } else {
            source.filter(type, a, b);
          }
        } else if (type == 'sort') {
          Lampa.Select.close();

          _this.changeBalanser(a.source);
        }
      };

      if (filter.addButtonBack) filter.addButtonBack();
      filter.render().find('.filter--sort span').text(Lampa.Lang.translate('online_balanser'));
      files.appendFiles(scroll.render());
      files.appendHead(filter.render());
      scroll.body().addClass('torrent-list');
      scroll.minus(files.render().find('.explorer__files-head'));
      this.search();
    };

    this.changeBalanser = function (balanser_name) {
      var last_select_balanser = Lampa.Storage.cache('online_last_balanser', 3000, {});
      last_select_balanser[object.movie.id] = balanser_name;
      Lampa.Storage.set('online_last_balanser', last_select_balanser);
      Lampa.Storage.set('online_balanser', balanser_name);
      var to = this.getChoice(balanser_name);
      var from = this.getChoice();
      if (from.voice_name) to.voice_name = from.voice_name;
      this.saveChoice(to, balanser_name);
      Lampa.Activity.replace();
    };

    this.createSource = function () {
      var last_select_balanser = Lampa.Storage.cache('online_last_balanser', 3000, {});

      if (last_select_balanser[object.movie.id]) {
        balanser = last_select_balanser[object.movie.id];
        Lampa.Storage.set('online_last_balanser', last_select_balanser);
      } else {
        balanser = Lampa.Storage.get('online_balanser', 'filmix');
      }

      if (!sources[balanser]) {
        balanser = 'filmix';
      }

      return new sources[balanser](this, object);
    };

    this.proxy = function (name) {
      var prox = Lampa.Storage.get('online_proxy_all');
      var need = Lampa.Storage.get('online_proxy_' + name);
      if (need) prox = need;

      if (prox && prox.slice(-1) !== '/') {
        prox += '/';
      }

      return prox;
    };
    /**
     * ÐŸÐ¾Ð´Ð³Ð¾Ñ‚Ð¾Ð²ÐºÐ°
     */


    this.create = function () {
      return this.render();
    };
    /**
     * ÐÐ°Ñ‡Ð°Ñ‚ÑŒ Ð¿Ð¾Ð¸ÑÐº
     */


    this.search = function () {
      this.activity.loader(true);
      this.filter({
        source: filter_sources
      }, this.getChoice());
      this.find();
    };

    this.find = function () {
      var _this2 = this;

      var url = this.proxy('videocdn') + 'http://cdn.svetacdn.in/api/short';
      var query = object.search;
      url = Lampa.Utils.addUrlComponent(url, 'api_token=3i40G5TSECmLF77oAqnEgbx61ZWaOYaE');

      var display = function display(json) {
        if (object.movie.imdb_id) {
          var imdb = json.data.filter(function (elem) {
            return elem.imdb_id == object.movie.imdb_id;
          });
          if (imdb.length) json.data = imdb;
        }

        if (json.data && json.data.length) {
          if (json.data.length == 1 || object.clarification) {
            _this2.extendChoice();

            var kinopoisk_id = json.data[0].kp_id || json.data[0].filmId;

            if (kinopoisk_id && source.searchByKinopoisk) {
              source.searchByKinopoisk(object, kinopoisk_id);
            } else if (json.data[0].imdb_id && source.searchByImdbID) {
              source.searchByImdbID(object, json.data[0].imdb_id);
            } else if (source.search) {
              source.search(object, json.data);
            } else {
              _this2.doesNotAnswer();
            }
          } else {
            _this2.similars(json.data);

            _this2.loading(false);
          }
        } else _this2.doesNotAnswer(query);
      };

      var pillow = function pillow(a, c) {
        network.timeout(1000 * 15);
        network["native"]('https://kinopoiskapiunofficial.tech/api/v2.1/films/search-by-keyword?keyword=' + encodeURIComponent(query), function (json) {
          json.data = json.films;
          display(json);
        }, function (a, c) {
          _this2.doesNotAnswer();
        }, false, {
          headers: {
            'X-API-KEY': '2d55adfd-019d-4567-bbf7-67d503f61b5a'
          }
        });
      };

      var letgo = function letgo(imdb_id) {
        if (imdb_id && source.searchByImdbID) {
          _this2.extendChoice();

          source.searchByImdbID(object, imdb_id);
        } else {
          var url_end = Lampa.Utils.addUrlComponent(url, imdb_id ? 'imdb_id=' + encodeURIComponent(imdb_id) : 'title=' + encodeURIComponent(query));
          network.timeout(1000 * 15);
          network["native"](url_end, function (json) {
            if (json.data && json.data.length) display(json);else {
              network["native"](Lampa.Utils.addUrlComponent(url, 'title=' + encodeURIComponent(query)), display.bind(_this2), pillow.bind(_this2));
            }
          }, pillow.bind(_this2));
        }
      };

      if (source.searchByTitle) {
        this.extendChoice();
        source.searchByTitle(object, object.movie.title || object.movie.name);
      } else if (object.movie.kinopoisk_id && source.searchByKinopoisk) {
        this.extendChoice();
        source.searchByKinopoisk(object, object.movie.kinopoisk_id);
      } else if (object.movie.imdb_id) {
        letgo(object.movie.imdb_id);
      } else if (object.movie.source == 'tmdb' || object.movie.source == 'cub') {
        var tmdburl = (object.movie.name ? 'tv' : 'movie') + '/' + object.movie.id + '/external_ids?api_key=4ef0d7355d9ffb5151e987764708ce96&language=ru';
        var baseurl = Lampa.TMDB.api(tmdburl);
        network.timeout(1000 * 10);
        network["native"](baseurl, function (ttid) {
          letgo(ttid.imdb_id);
        }, function (a, c) {
          letgo();
        });
      } else {
        letgo();
      }
    };

    this.getChoice = function (for_balanser) {
      var data = Lampa.Storage.cache('online_choice_' + (for_balanser || balanser), 3000, {});
      var save = data[selected_id || object.movie.id] || {};
      Lampa.Arrays.extend(save, {
        season: 0,
        voice: 0,
        voice_name: '',
        voice_id: 0,
        episodes_view: {},
        movie_view: ''
      });
      return save;
    };

    this.extendChoice = function () {
      extended = true;
      source.extendChoice(this.getChoice());
    };

    this.saveChoice = function (choice, for_balanser) {
      var data = Lampa.Storage.cache('online_choice_' + (for_balanser || balanser), 3000, {});
      data[selected_id || object.movie.id] = choice;
      Lampa.Storage.set('online_choice_' + (for_balanser || balanser), data);
    };
    /**
     * Ð•ÑÑ‚ÑŒ Ð¿Ð¾Ñ…Ð¾Ð¶Ð¸Ðµ ÐºÐ°Ñ€Ñ‚Ð¾Ñ‡ÐºÐ¸
     * @param {Object} json 
     */


    this.similars = function (json) {
      var _this3 = this;

      json.forEach(function (elem) {
        var info = [];
        var year = ((elem.start_date || elem.year || '') + '').slice(0, 4);
        if (elem.rating && elem.rating !== 'null' && elem.filmId) info.push(Lampa.Template.get('online_prestige_rate', {
          rate: elem.rating
        }, true));
        if (year) info.push(year);

        if (elem.countries && elem.countries.length) {
          info.push((elem.filmId ? elem.countries.map(function (c) {
            return c.country;
          }) : elem.countries).join(', '));
        }

        if (elem.categories && elem.categories.length) {
          info.push(elem.categories.slice(0, 4).join(', '));
        }

        var name = elem.title || elem.ru_title || elem.en_title || elem.nameRu || elem.nameEn;
        var orig = elem.orig_title || elem.nameEn || '';
        elem.title = name + (orig && orig !== name ? ' / ' + orig : '');
        elem.time = elem.filmLength || '';
        elem.info = info.join('<span class="online-prestige-split">â—</span>');
        var item = Lampa.Template.get('online_prestige_folder', elem);
        item.on('hover:enter', function () {
          _this3.activity.loader(true);

          _this3.reset();

          object.search_date = year;
          selected_id = elem.id;

          _this3.extendChoice();

          var kinopoisk_id = elem.kp_id || elem.filmId;

          if (kinopoisk_id && source.searchByKinopoisk) {
            source.searchByKinopoisk(object, kinopoisk_id);
          } else if (source.search) {
            source.search(object, [elem]);
          } else {
            _this3.doesNotAnswer();
          }
        }).on('hover:focus', function (e) {
          last = e.target;
          scroll.update($(e.target), true);
        });
        scroll.append(item);
      });
    };

    this.clearImages = function () {
      images.forEach(function (img) {
        img.onerror = function () {};

        img.onload = function () {};

        img.src = '';
      });
      images = [];
    };
    /**
     * ÐžÑ‡Ð¸ÑÑ‚Ð¸Ñ‚ÑŒ ÑÐ¿Ð¸ÑÐ¾Ðº Ñ„Ð°Ð¹Ð»Ð¾Ð²
     */


    this.reset = function () {
      last = false;
      clearInterval(balanser_timer);
      network.clear();
      this.clearImages();
      scroll.render().find('.empty').remove();
      scroll.clear();
    };
    /**
     * Ð—Ð°Ð³Ñ€ÑƒÐ·ÐºÐ°
     */


    this.loading = function (status) {
      if (status) this.activity.loader(true);else {
        this.activity.loader(false);
        this.activity.toggle();
      }
    };
    /**
     * ÐŸÐ¾ÑÑ‚Ñ€Ð¾Ð¸Ñ‚ÑŒ Ñ„Ð¸Ð»ÑŒÑ‚Ñ€
     */


    this.filter = function (filter_items, choice) {
      var _this4 = this;

      var select = [];

      var add = function add(type, title) {
        var need = _this4.getChoice();

        var items = filter_items[type];
        var subitems = [];
        var value = need[type];
        items.forEach(function (name, i) {
          subitems.push({
            title: name,
            selected: value == i,
            index: i
          });
        });
        select.push({
          title: title,
          subtitle: items[value],
          items: subitems,
          stype: type
        });
      };

      filter_items.source = filter_sources;
      select.push({
        title: Lampa.Lang.translate('torrent_parser_reset'),
        reset: true
      });
      this.saveChoice(choice);
      if (filter_items.voice && filter_items.voice.length) add('voice', Lampa.Lang.translate('torrent_parser_voice'));
      if (filter_items.season && filter_items.season.length) add('season', Lampa.Lang.translate('torrent_serial_season'));
      filter.set('filter', select);
      filter.set('sort', filter_sources.map(function (e) {
        return {
          title: e,
          source: e,
          selected: e == balanser
        };
      }));
      this.selected(filter_items);
    };
    /**
     * Ð—Ð°ÐºÑ€Ñ‹Ñ‚ÑŒ Ñ„Ð¸Ð»ÑŒÑ‚Ñ€
     */


    this.closeFilter = function () {
      if ($('body').hasClass('selectbox--open')) Lampa.Select.close();
    };
    /**
     * ÐŸÐ¾ÐºÐ°Ð·Ð°Ñ‚ÑŒ Ñ‡Ñ‚Ð¾ Ð²Ñ‹Ð±Ñ€Ð°Ð½Ð¾ Ð² Ñ„Ð¸Ð»ÑŒÑ‚Ñ€Ðµ
     */


    this.selected = function (filter_items) {
      var need = this.getChoice(),
          select = [];

      for (var i in need) {
        if (filter_items[i] && filter_items[i].length) {
          if (i == 'voice') {
            select.push(filter_translate[i] + ': ' + filter_items[i][need[i]]);
          } else if (i !== 'source') {
            if (filter_items.season.length >= 1) {
              select.push(filter_translate.season + ': ' + filter_items[i][need[i]]);
            }
          }
        }
      }

      filter.chosen('filter', select);
      filter.chosen('sort', [balanser]);
    };

    this.getEpisodes = function (season, call) {
      var episodes = [];

      if (typeof object.movie.id == 'number' && object.movie.name) {
        var tmdburl = 'tv/' + object.movie.id + '/season/' + season + '?api_key=' + Lampa.TMDB.key() + '&language=' + Lampa.Storage.get('language', 'ru');
        var baseurl = Lampa.TMDB.api(tmdburl);
        network.timeout(1000 * 10);
        network["native"](baseurl, function (data) {
          episodes = data.episodes || [];
          call(episodes);
        }, function (a, c) {
          call(episodes);
        });
      } else call(episodes);
    };
    /**
     * Ð”Ð¾Ð±Ð°Ð²Ð¸Ñ‚ÑŒ ÑÐ»ÐµÐ¼ÐµÐ½Ñ‚Ñ‹ Ð² ÑÐ¿Ð¸ÑÐ¾Ðº
     */


    this.append = function (item) {
      item.on('hover:focus', function (e) {
        last = e.target;
        scroll.update($(e.target), true);
      });
      scroll.append(item);
    };
    /**
     * ÐžÑ‚Ñ€Ð¸ÑÐ¾Ð²ÐºÐ° Ñ„Ð°Ð¹Ð»Ð¾Ð²
     */


    this.draw = function (items) {
      var _this5 = this;

      var params = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
      if (!items.length) return this.empty();
      this.getEpisodes(items[0].season, function (episodes) {
        var viewed = Lampa.Storage.cache('online_view', 5000, []);
        var serial = object.movie.name ? true : false;

        var choice = _this5.getChoice();

        var fully = window.innerWidth > 480;
        var scroll_to_element = false;
        var scroll_to_mark = false;
        items.forEach(function (element, index) {
          var episode = serial && episodes.length && !params.similars ? episodes.find(function (e) {
            return e.episode_number == element.episode;
          }) : false;
          var episode_num = element.episode || index + 1;
          var episode_last = choice.episodes_view[element.season];
          Lampa.Arrays.extend(element, {
            info: '',
            quality: '',
            time: Lampa.Utils.secondsToTime((episode ? episode.runtime : object.movie.runtime) * 60, true)
          });
          var hash_timeline = Lampa.Utils.hash(element.season ? [element.season, element.episode, object.movie.original_title].join('') : object.movie.original_title);
          var hash_behold = Lampa.Utils.hash(element.season ? [element.season, element.episode, object.movie.original_title, element.voice_name].join('') : object.movie.original_title + element.voice_name);
          var data = {
            hash_timeline: hash_timeline,
            hash_behold: hash_behold
          };
          var info = [];

          if (element.season) {
            element.translate_episode_end = _this5.getLastEpisode(items);
            element.translate_voice = element.voice_name;
          }

          element.timeline = Lampa.Timeline.view(hash_timeline);

          if (episode) {
            element.title = episode.name;
            if (element.info.length < 30 && episode.vote_average) info.push(Lampa.Template.get('online_prestige_rate', {
              rate: parseFloat(episode.vote_average + '').toFixed(1)
            }, true));
            if (episode.air_date && fully) info.push(Lampa.Utils.parseTime(episode.air_date).full);
          } else if (object.movie.release_date && fully) {
            info.push(Lampa.Utils.parseTime(object.movie.release_date).full);
          }

          if (!serial && object.movie.tagline && element.info.length < 30) info.push(object.movie.tagline);
          if (element.info) info.push(element.info);
          if (info.length) element.info = info.map(function (i) {
            return '<span>' + i + '</span>';
          }).join('<span class="online-prestige-split">â—</span>');
          var html = Lampa.Template.get('online_prestige_full', element);
          var loader = html.find('.online-prestige__loader');
          var image = html.find('.online-prestige__img');

          if (!serial) {
            if (choice.movie_view == hash_behold) scroll_to_element = html;
          } else if (typeof episode_last !== 'undefined' && episode_last == episode_num) {
            scroll_to_element = html;
          }

          if (serial && !episode) {
            image.append('<div class="online-prestige__episode-number">' + ('0' + (element.episode || index + 1)).slice(-2) + '</div>');
            loader.remove();
          } else {
            var img = html.find('img')[0];

            img.onerror = function () {
              img.src = './img/img_broken.svg';
            };

            img.onload = function () {
              image.addClass('online-prestige__img--loaded');
              loader.remove();
              if (serial) image.append('<div class="online-prestige__episode-number">' + ('0' + (element.episode || index + 1)).slice(-2) + '</div>');
            };

            img.src = Lampa.TMDB.image('t/p/w300' + (episode ? episode.still_path : object.movie.backdrop_path));
            images.push(img);
          }

          html.find('.online-prestige__timeline').append(Lampa.Timeline.render(element.timeline));

          if (viewed.indexOf(hash_behold) !== -1) {
            scroll_to_mark = html;
            html.find('.online-prestige__img').append('<div class="online-prestige__viewed">' + Lampa.Template.get('icon_viewed', {}, true) + '</div>');
          }

          element.mark = function () {
            viewed = Lampa.Storage.cache('online_view', 5000, []);

            if (viewed.indexOf(hash_behold) == -1) {
              viewed.push(hash_behold);
              Lampa.Storage.set('online_view', viewed);

              if (html.find('.online-prestige__viewed').length == 0) {
                html.find('.online-prestige__img').append('<div class="online-prestige__viewed">' + Lampa.Template.get('icon_viewed', {}, true) + '</div>');
              }
            }

            choice = _this5.getChoice();

            if (!serial) {
              choice.movie_view = hash_behold;
            } else {
              choice.episodes_view[element.season] = episode_num;
            }

            _this5.saveChoice(choice);
          };

          element.unmark = function () {
            viewed = Lampa.Storage.cache('online_view', 5000, []);

            if (viewed.indexOf(hash_behold) !== -1) {
              Lampa.Arrays.remove(viewed, hash_behold);
              Lampa.Storage.set('online_view', viewed);
              Lampa.Account.removeStorage('online_view', hash_behold);
              html.find('.online-prestige__viewed').remove();
            }
          };

          element.timeclear = function () {
            element.timeline.percent = 0;
            element.timeline.time = 0;
            element.timeline.duration = 0;
            Lampa.Timeline.update(element.timeline);
          };

          html.on('hover:enter', function () {
            if (object.movie.id) Lampa.Favorite.add('history', object.movie, 100);
            if (params.onEnter) params.onEnter(element, html, data);
          }).on('hover:focus', function (e) {
            last = e.target;
            if (params.onFocus) params.onFocus(element, html, data);
            scroll.update($(e.target), true);
          });
          if (params.onRender) params.onRender(element, html, data);

          _this5.contextMenu({
            html: html,
            element: element,
            onFile: function onFile(call) {
              if (params.onContextMenu) params.onContextMenu(element, html, data, call);
            },
            onClearAllMark: function onClearAllMark() {
              items.forEach(function (elem) {
                elem.unmark();
              });
            },
            onClearAllTime: function onClearAllTime() {
              items.forEach(function (elem) {
                elem.timeclear();
              });
            }
          });

          scroll.append(html);
        });

        if (serial && episodes.length > items.length && !params.similars) {
          var left = episodes.slice(items.length);
          left.forEach(function (episode) {
            var info = [];
            if (episode.vote_average) info.push(Lampa.Template.get('online_prestige_rate', {
              rate: parseFloat(episode.vote_average + '').toFixed(1)
            }, true));
            if (episode.air_date) info.push(Lampa.Utils.parseTime(episode.air_date).full);
            var air = new Date((episode.air_date + '').replace(/-/g, '/'));
            var now = Date.now();
            var day = Math.round((air.getTime() - now) / (24 * 60 * 60 * 1000));
            var txt = Lampa.Lang.translate('full_episode_days_left') + ': ' + day;
            var html = Lampa.Template.get('online_prestige_full', {
              time: Lampa.Utils.secondsToTime((episode ? episode.runtime : object.movie.runtime) * 60, true),
              info: info.length ? info.map(function (i) {
                return '<span>' + i + '</span>';
              }).join('<span class="online-prestige-split">â—</span>') : '',
              title: episode.name,
              quality: day > 0 ? txt : ''
            });
            var loader = html.find('.online-prestige__loader');
            var image = html.find('.online-prestige__img');
            var season = items[0] ? items[0].season : 1;
            html.find('.online-prestige__timeline').append(Lampa.Timeline.render(Lampa.Timeline.view(Lampa.Utils.hash([season, episode.episode_number, object.movie.original_title].join('')))));
            var img = html.find('img')[0];

            if (episode.still_path) {
              img.onerror = function () {
                img.src = './img/img_broken.svg';
              };

              img.onload = function () {
                image.addClass('online-prestige__img--loaded');
                loader.remove();
                image.append('<div class="online-prestige__episode-number">' + ('0' + episode.episode_number).slice(-2) + '</div>');
              };

              img.src = Lampa.TMDB.image('t/p/w300' + episode.still_path);
              images.push(img);
            } else {
              loader.remove();
              image.append('<div class="online-prestige__episode-number">' + ('0' + episode.episode_number).slice(-2) + '</div>');
            }

            html.on('hover:focus', function (e) {
              last = e.target;
              scroll.update($(e.target), true);
            });
            scroll.append(html);
          });
        }

        if (scroll_to_element) {
          last = scroll_to_element[0];
        } else if (scroll_to_mark) {
          last = scroll_to_mark[0];
        }

        Lampa.Controller.enable('content');
      });
    };
    /**
     * ÐœÐµÐ½ÑŽ
     */


    this.contextMenu = function (params) {
      params.html.on('hover:long', function () {
        function show(extra) {
          var enabled = Lampa.Controller.enabled().name;
          var menu = [];

          if (Lampa.Platform.is('webos')) {
            menu.push({
              title: Lampa.Lang.translate('player_lauch') + ' - Webos',
              player: 'webos'
            });
          }

          if (Lampa.Platform.is('android')) {
            menu.push({
              title: Lampa.Lang.translate('player_lauch') + ' - Android',
              player: 'android'
            });
          }

          menu.push({
            title: Lampa.Lang.translate('player_lauch') + ' - Lampa',
            player: 'lampa'
          });
          menu.push({
            title: Lampa.Lang.translate('online_video'),
            separator: true
          });
          menu.push({
            title: Lampa.Lang.translate('torrent_parser_label_title'),
            mark: true
          });
          menu.push({
            title: Lampa.Lang.translate('torrent_parser_label_cancel_title'),
            unmark: true
          });
          menu.push({
            title: Lampa.Lang.translate('time_reset'),
            timeclear: true
          });

          if (extra) {
            menu.push({
              title: Lampa.Lang.translate('copy_link'),
              copylink: true
            });
          }

          menu.push({
            title: Lampa.Lang.translate('more'),
            separator: true
          });

          if (Lampa.Account.logged() && params.element && typeof params.element.season !== 'undefined' && params.element.translate_voice) {
            menu.push({
              title: Lampa.Lang.translate('online_voice_subscribe'),
              subscribe: true
            });
          }

          menu.push({
            title: Lampa.Lang.translate('online_clear_all_marks'),
            clearallmark: true
          });
          menu.push({
            title: Lampa.Lang.translate('online_clear_all_timecodes'),
            timeclearall: true
          });
          Lampa.Select.show({
            title: Lampa.Lang.translate('title_action'),
            items: menu,
            onBack: function onBack() {
              Lampa.Controller.toggle(enabled);
            },
            onSelect: function onSelect(a) {
              if (a.mark) params.element.mark();
              if (a.unmark) params.element.unmark();
              if (a.timeclear) params.element.timeclear();
              if (a.clearallmark) params.onClearAllMark();
              if (a.timeclearall) params.onClearAllTime();
              Lampa.Controller.toggle(enabled);

              if (a.player) {
                Lampa.Player.runas(a.player);
                params.html.trigger('hover:enter');
              }

              if (a.copylink) {
                if (extra.quality) {
                  var qual = [];

                  for (var i in extra.quality) {
                    qual.push({
                      title: i,
                      file: extra.quality[i]
                    });
                  }

                  Lampa.Select.show({
                    title: Lampa.Lang.translate('settings_server_links'),
                    items: qual,
                    onBack: function onBack() {
                      Lampa.Controller.toggle(enabled);
                    },
                    onSelect: function onSelect(b) {
                      Lampa.Utils.copyTextToClipboard(b.file, function () {
                        Lampa.Noty.show(Lampa.Lang.translate('copy_secuses'));
                      }, function () {
                        Lampa.Noty.show(Lampa.Lang.translate('copy_error'));
                      });
                    }
                  });
                } else {
                  Lampa.Utils.copyTextToClipboard(extra.file, function () {
                    Lampa.Noty.show(Lampa.Lang.translate('copy_secuses'));
                  }, function () {
                    Lampa.Noty.show(Lampa.Lang.translate('copy_error'));
                  });
                }
              }

              if (a.subscribe) {
                Lampa.Account.subscribeToTranslation({
                  card: object.movie,
                  season: params.element.season,
                  episode: params.element.translate_episode_end,
                  voice: params.element.translate_voice
                }, function () {
                  Lampa.Noty.show(Lampa.Lang.translate('online_voice_success'));
                }, function () {
                  Lampa.Noty.show(Lampa.Lang.translate('online_voice_error'));
                });
              }
            }
          });
        }

        params.onFile(show);
      }).on('hover:focus', function () {
        if (Lampa.Helper) Lampa.Helper.show('online_file', Lampa.Lang.translate('helper_online_file'), params.html);
      });
    };
    /**
     * ÐŸÐ¾ÐºÐ°Ð·Ð°Ñ‚ÑŒ Ð¿ÑƒÑÑ‚Ð¾Ð¹ Ñ€ÐµÐ·ÑƒÐ»ÑŒÑ‚Ð°Ñ‚
     */


    this.empty = function (msg) {
      var html = Lampa.Template.get('online_does_not_answer', {});
      html.find('.online-empty__buttons').remove();
      html.find('.online-empty__title').text(Lampa.Lang.translate('empty_title_two'));
      html.find('.online-empty__time').text(Lampa.Lang.translate('empty_text'));
      scroll.append(html);
      this.loading(false);
    };

    this.doesNotAnswer = function () {
      var _this6 = this;

      this.reset();
      var html = Lampa.Template.get('online_does_not_answer', {
        balanser: balanser
      });
      var tic = 10;
      html.find('.cancel').on('hover:enter', function () {
        clearInterval(balanser_timer);
      });
      html.find('.change').on('hover:enter', function () {
        clearInterval(balanser_timer);
        filter.render().find('.filter--sort').trigger('hover:enter');
      });
      scroll.append(html);
      this.loading(false);
      balanser_timer = setInterval(function () {
        tic--;
        html.find('.timeout').text(tic);

        if (tic == 0) {
          clearInterval(balanser_timer);
          var keys = Lampa.Arrays.getKeys(sources);
          var indx = keys.indexOf(balanser);
          var next = keys[indx + 1];
          if (!next) next = keys[0];
          balanser = next;
          if (Lampa.Activity.active().activity == _this6.activity) _this6.changeBalanser(balanser);
        }
      }, 1000);
    };

    this.getLastEpisode = function (items) {
      var last_episode = 0;
      items.forEach(function (e) {
        if (typeof e.episode !== 'undefined') last_episode = Math.max(last_episode, parseInt(e.episode));
      });
      return last_episode;
    };
    /**
     * ÐÐ°Ñ‡Ð°Ñ‚ÑŒ Ð½Ð°Ð²Ð¸Ð³Ð°Ñ†Ð¸ÑŽ Ð¿Ð¾ Ñ„Ð°Ð¹Ð»Ð°Ð¼
     */


    this.start = function () {
      if (Lampa.Activity.active().activity !== this.activity) return;

      if (!initialized) {
        initialized = true;
        this.initialize();
      }

      Lampa.Background.immediately(Lampa.Utils.cardImgBackgroundBlur(object.movie));
      Lampa.Controller.add('content', {
        toggle: function toggle() {
          Lampa.Controller.collectionSet(scroll.render(), files.render());
          Lampa.Controller.collectionFocus(last || false, scroll.render());
        },
        up: function up() {
          if (Navigator.canmove('up')) {
            Navigator.move('up');
          } else Lampa.Controller.toggle('head');
        },
        down: function down() {
          Navigator.move('down');
        },
        right: function right() {
          if (Navigator.canmove('right')) Navigator.move('right');else filter.show(Lampa.Lang.translate('title_filter'), 'filter');
        },
        left: function left() {
          if (Navigator.canmove('left')) Navigator.move('left');else Lampa.Controller.toggle('menu');
        },
        gone: function gone() {
          clearInterval(balanser_timer);
        },
        back: this.back
      });
      Lampa.Controller.toggle('content');
    };

    this.render = function () {
      return files.render();
    };

    this.back = function () {
      Lampa.Activity.backward();
    };

    this.pause = function () {};

    this.stop = function () {};

    this.destroy = function () {
      network.clear();
      this.clearImages();
      files.destroy();
      scroll.destroy();
      clearInterval(balanser_timer);
      if (source) source.destroy();
    };
  }

  function startPlugin() {
    window.online_prestige = true;
    var manifest = {
      type: 'video',
      version: '1.0.8',
      name: 'ÐžÐ½Ð»Ð°Ð¹Ð½ - Prestige',
      description: 'ÐŸÐ»Ð°Ð³Ð¸Ð½ Ð´Ð»Ñ Ð¿Ñ€Ð¾ÑÐ¼Ð¾Ñ‚Ñ€Ð° Ð¾Ð½Ð»Ð°Ð¹Ð½ ÑÐµÑ€Ð¸Ð°Ð»Ð¾Ð² Ð¸ Ñ„Ð¸Ð»ÑŒÐ¼Ð¾Ð²',
      component: 'online_prestige',
      onContextMenu: function onContextMenu(object) {
        return {
          name: Lampa.Lang.translate('online_watch'),
          description: ''
        };
      },
      onContextLauch: function onContextLauch(object) {
        resetTemplates();
        Lampa.Component.add('online_prestige', component);
        Lampa.Activity.push({
          url: '',
          title: Lampa.Lang.translate('title_online'),
          component: 'online_prestige',
          search: object.title,
          search_one: object.title,
          search_two: object.original_title,
          movie: object,
          page: 1
        });
      }
    };
    Lampa.Manifest.plugins = manifest;
    Lampa.Lang.add({
      online_watch: {
        ru: 'Ð¡Ð¼Ð¾Ñ‚Ñ€ÐµÑ‚ÑŒ Ð¾Ð½Ð»Ð°Ð¹Ð½',
        en: 'Watch online',
        ua: 'Ð”Ð¸Ð²Ð¸Ñ‚Ð¸ÑÑ Ð¾Ð½Ð»Ð°Ð¹Ð½',
        zh: 'åœ¨çº¿è§‚çœ‹'
      },
      online_video: {
        ru: 'Ð’Ð¸Ð´ÐµÐ¾',
        en: 'Video',
        ua: 'Ð’Ñ–Ð´ÐµÐ¾',
        zh: 'è§†é¢‘'
      },
      online_nolink: {
        ru: 'ÐÐµ ÑƒÐ´Ð°Ð»Ð¾ÑÑŒ Ð¸Ð·Ð²Ð»ÐµÑ‡ÑŒ ÑÑÑ‹Ð»ÐºÑƒ',
        uk: 'ÐÐµÐ¼Ð¾Ð¶Ð»Ð¸Ð²Ð¾ Ð¾Ñ‚Ñ€Ð¸Ð¼Ð°Ñ‚Ð¸ Ð¿Ð¾ÑÐ¸Ð»Ð°Ð½Ð½Ñ',
        en: 'Failed to fetch link',
        zh: 'èŽ·å–é“¾æŽ¥å¤±è´¥'
      },
      online_waitlink: {
        ru: 'Ð Ð°Ð±Ð¾Ñ‚Ð°ÐµÐ¼ Ð½Ð°Ð´ Ð¸Ð·Ð²Ð»ÐµÑ‡ÐµÐ½Ð¸ÐµÐ¼ ÑÑÑ‹Ð»ÐºÐ¸, Ð¿Ð¾Ð´Ð¾Ð¶Ð´Ð¸Ñ‚Ðµ...',
        uk: 'ÐŸÑ€Ð°Ñ†ÑŽÑ”Ð¼Ð¾ Ð½Ð°Ð´ Ð¾Ñ‚Ñ€Ð¸Ð¼Ð°Ð½Ð½ÑÐ¼ Ð¿Ð¾ÑÐ¸Ð»Ð°Ð½Ð½Ñ, Ð·Ð°Ñ‡ÐµÐºÐ°Ð¹Ñ‚Ðµ...',
        en: 'Working on extracting the link, please wait...',
        zh: 'æ­£åœ¨æå–é“¾æŽ¥ï¼Œè¯·ç¨å€™...'
      },
      online_balanser: {
        ru: 'Ð‘Ð°Ð»Ð°Ð½ÑÐµÑ€',
        uk: 'Ð‘Ð°Ð»Ð°Ð½ÑÐµÑ€',
        en: 'Balancer',
        zh: 'å¹³è¡¡å™¨'
      },
      helper_online_file: {
        ru: 'Ð£Ð´ÐµÑ€Ð¶Ð¸Ð²Ð°Ð¹Ñ‚Ðµ ÐºÐ»Ð°Ð²Ð¸ÑˆÑƒ "ÐžÐš" Ð´Ð»Ñ Ð²Ñ‹Ð·Ð¾Ð²Ð° ÐºÐ¾Ð½Ñ‚ÐµÐºÑÑ‚Ð½Ð¾Ð³Ð¾ Ð¼ÐµÐ½ÑŽ',
        uk: 'Ð£Ñ‚Ñ€Ð¸Ð¼ÑƒÐ¹Ñ‚Ðµ ÐºÐ»Ð°Ð²Ñ–ÑˆÑƒ "ÐžÐš" Ð´Ð»Ñ Ð²Ð¸ÐºÐ»Ð¸ÐºÑƒ ÐºÐ¾Ð½Ñ‚ÐµÐºÑÑ‚Ð½Ð¾Ð³Ð¾ Ð¼ÐµÐ½ÑŽ',
        en: 'Hold the "OK" key to bring up the context menu',
        zh: 'æŒ‰ä½â€œç¡®å®šâ€é”®è°ƒå‡ºä¸Šä¸‹æ–‡èœå•'
      },
      online_query_start: {
        ru: 'ÐŸÐ¾ Ð·Ð°Ð¿Ñ€Ð¾ÑÑƒ',
        uk: 'ÐÐ° Ð·Ð°Ð¿Ð¸Ñ‚',
        en: 'On request',
        zh: 'æ ¹æ®è¦æ±‚'
      },
      online_query_end: {
        ru: 'Ð½ÐµÑ‚ Ñ€ÐµÐ·ÑƒÐ»ÑŒÑ‚Ð°Ñ‚Ð¾Ð²',
        uk: 'Ð½ÐµÐ¼Ð°Ñ” Ñ€ÐµÐ·ÑƒÐ»ÑŒÑ‚Ð°Ñ‚Ñ–Ð²',
        en: 'no results',
        zh: 'æ²¡æœ‰ç»“æžœ'
      },
      title_online: {
        ru: 'ÐžÐ½Ð»Ð°Ð¹Ð½',
        uk: 'ÐžÐ½Ð»Ð°Ð¹Ð½',
        en: 'Online',
        zh: 'åœ¨çº¿çš„'
      },
      title_proxy: {
        ru: 'ÐŸÑ€Ð¾ÐºÑÐ¸',
        uk: 'ÐŸÑ€Ð¾ÐºÑÑ–',
        en: 'Proxy',
        zh: 'ä»£ç†äºº'
      },
      online_proxy_title: {
        ru: 'ÐžÑÐ½Ð¾Ð²Ð½Ð¾Ð¹ Ð¿Ñ€Ð¾ÐºÑÐ¸',
        uk: 'ÐžÑÐ½Ð¾Ð²Ð½Ð¸Ð¹ Ð¿Ñ€Ð¾ÐºÑÑ–',
        en: 'Main proxy',
        zh: 'ä¸»è¦ä»£ç†'
      },
      online_proxy_descr: {
        ru: 'Ð‘ÑƒÐ´ÐµÑ‚ Ð¸ÑÐ¿Ð¾Ð»ÑŒÐ·Ð¾Ð²Ð°Ñ‚ÑŒÑÑ Ð´Ð»Ñ Ð²ÑÐµÑ… Ð±Ð°Ð»Ð°Ð½ÑÐµÑ€Ð¾Ð²',
        uk: 'Ð’Ð¸ÐºÐ¾Ñ€Ð¸ÑÑ‚Ð¾Ð²ÑƒÐ²Ð°Ñ‚Ð¸Ð¼ÐµÑ‚ÑŒÑÑ Ð´Ð»Ñ Ð²ÑÑ–Ñ… Ð±Ð°Ð»Ð°Ð½ÑÐµÑ€Ñ–Ð²',
        en: 'Will be used for all balancers',
        zh: 'å°†ç”¨äºŽæ‰€æœ‰å¹³è¡¡å™¨'
      },
      online_proxy_placeholder: {
        ru: 'ÐÐ°Ð¿Ñ€Ð¸Ð¼ÐµÑ€: http://proxy.com',
        uk: 'ÐÐ°Ð¿Ñ€Ð¸ÐºÐ»Ð°Ð´: http://proxy.com',
        en: 'For example: http://proxy.com',
        zh: 'ä¾‹å¦‚ï¼šhttp://proxy.com'
      },
      filmix_param_add_title: {
        ru: 'Ð”Ð¾Ð±Ð°Ð²Ð¸Ñ‚ÑŒ Ð¢ÐžÐšÐ•Ð Ð¾Ñ‚ Filmix',
        uk: 'Ð”Ð¾Ð´Ð°Ñ‚Ð¸ Ð¢ÐžÐšÐ•Ð Ð²Ñ–Ð´ Filmix',
        en: 'Add TOKEN from Filmix',
        zh: 'ä»Ž Filmix æ·»åŠ  TOKEN'
      },
      filmix_param_add_descr: {
        ru: 'Ð”Ð¾Ð±Ð°Ð²ÑŒÑ‚Ðµ Ð¢ÐžÐšÐ•Ð Ð´Ð»Ñ Ð¿Ð¾Ð´ÐºÐ»ÑŽÑ‡ÐµÐ½Ð¸Ñ Ð¿Ð¾Ð´Ð¿Ð¸ÑÐºÐ¸',
        uk: 'Ð”Ð¾Ð´Ð°Ð¹Ñ‚Ðµ Ð¢ÐžÐšÐ•Ð Ð´Ð»Ñ Ð¿Ñ–Ð´ÐºÐ»ÑŽÑ‡ÐµÐ½Ð½Ñ Ð¿ÐµÑ€ÐµÐ´Ð¿Ð»Ð°Ñ‚Ð¸',
        en: 'Add a TOKEN to connect a subscription',
        zh: 'æ·»åŠ  TOKEN ä»¥è¿žæŽ¥è®¢é˜…'
      },
      filmix_param_placeholder: {
        ru: 'ÐÐ°Ð¿Ñ€Ð¸Ð¼ÐµÑ€: nxjekeb57385b..',
        uk: 'ÐÐ°Ð¿Ñ€Ð¸ÐºÐ»Ð°Ð´: nxjekeb57385b..',
        en: 'For example: nxjekeb57385b..',
        zh: 'ä¾‹å¦‚ï¼šnxjekeb57385b..'
      },
      filmix_param_add_device: {
        ru: 'Ð”Ð¾Ð±Ð°Ð²Ð¸Ñ‚ÑŒ ÑƒÑÑ‚Ñ€Ð¾Ð¹ÑÑ‚Ð²Ð¾ Ð½Ð° Filmix',
        uk: 'Ð”Ð¾Ð´Ð°Ñ‚Ð¸ Ð¿Ñ€Ð¸ÑÑ‚Ñ€Ñ–Ð¹ Ð½Ð° Filmix',
        en: 'Add Device to Filmix',
        zh: 'å°†è®¾å¤‡æ·»åŠ åˆ° Filmix'
      },
      filmix_modal_text: {
        ru: 'Ð’Ð²ÐµÐ´Ð¸Ñ‚Ðµ ÐµÐ³Ð¾ Ð½Ð° ÑÑ‚Ñ€Ð°Ð½Ð¸Ñ†Ðµ https://filmix.ac/consoles Ð² Ð²Ð°ÑˆÐµÐ¼ Ð°Ð²Ñ‚Ð¾Ñ€Ð¸Ð·Ð¾Ð²Ð°Ð½Ð½Ð¾Ð¼ Ð°ÐºÐºÐ°ÑƒÐ½Ñ‚Ðµ!',
        uk: 'Ð’Ð²ÐµÐ´Ñ–Ñ‚ÑŒ Ð¹Ð¾Ð³Ð¾ Ð½Ð° ÑÑ‚Ð¾Ñ€Ñ–Ð½Ñ†Ñ– https://filmix.ac/consoles Ñƒ Ð²Ð°ÑˆÐ¾Ð¼Ñƒ Ð°Ð²Ñ‚Ð¾Ñ€Ð¸Ð·Ð¾Ð²Ð°Ð½Ð¾Ð¼Ñƒ Ð¾Ð±Ð»Ñ–ÐºÐ¾Ð²Ð¾Ð¼Ñƒ Ð·Ð°Ð¿Ð¸ÑÑ–!',
        en: 'Enter it at https://filmix.ac/consoles in your authorized account!',
        zh: 'åœ¨æ‚¨çš„æŽˆæƒå¸æˆ·ä¸­çš„ https://filmix.ac/consoles ä¸­è¾“å…¥ï¼'
      },
      filmix_modal_wait: {
        ru: 'ÐžÐ¶Ð¸Ð´Ð°ÐµÐ¼ ÐºÐ¾Ð´',
        uk: 'ÐžÑ‡Ñ–ÐºÑƒÑ”Ð¼Ð¾ ÐºÐ¾Ð´',
        en: 'Waiting for the code',
        zh: 'æˆ‘ä»¬æ­£åœ¨ç­‰å¾…ä»£ç '
      },
      filmix_copy_secuses: {
        ru: 'ÐšÐ¾Ð´ ÑÐºÐ¾Ð¿Ð¸Ñ€Ð¾Ð²Ð°Ð½ Ð² Ð±ÑƒÑ„ÐµÑ€ Ð¾Ð±Ð¼ÐµÐ½Ð°',
        uk: 'ÐšÐ¾Ð´ ÑÐºÐ¾Ð¿Ñ–Ð¹Ð¾Ð²Ð°Ð½Ð¾ Ð² Ð±ÑƒÑ„ÐµÑ€ Ð¾Ð±Ð¼Ñ–Ð½Ñƒ',
        en: 'Code copied to clipboard',
        zh: 'ä»£ç å¤åˆ¶åˆ°å‰ªè´´æ¿'
      },
      filmix_copy_fail: {
        ru: 'ÐžÑˆÐ¸Ð±ÐºÐ° Ð¿Ñ€Ð¸ ÐºÐ¾Ð¿Ð¸Ñ€Ð¾Ð²Ð°Ð½Ð¸Ð¸',
        uk: 'ÐŸÐ¾Ð¼Ð¸Ð»ÐºÐ° Ð¿Ñ€Ð¸ ÐºÐ¾Ð¿Ñ–ÑŽÐ²Ð°Ð½Ð½Ñ–',
        en: 'Copy error',
        zh: 'å¤åˆ¶é”™è¯¯'
      },
      filmix_nodevice: {
        ru: 'Ð£ÑÑ‚Ñ€Ð¾Ð¹ÑÑ‚Ð²Ð¾ Ð½Ðµ Ð°Ð²Ñ‚Ð¾Ñ€Ð¸Ð·Ð¾Ð²Ð°Ð½Ð¾',
        uk: 'ÐŸÑ€Ð¸ÑÑ‚Ñ€Ñ–Ð¹ Ð½Ðµ Ð°Ð²Ñ‚Ð¾Ñ€Ð¸Ð·Ð¾Ð²Ð°Ð½Ð¸Ð¹',
        en: 'Device not authorized',
        zh: 'è®¾å¤‡æœªæŽˆæƒ'
      },
      title_status: {
        ru: 'Ð¡Ñ‚Ð°Ñ‚ÑƒÑ',
        uk: 'Ð¡Ñ‚Ð°Ñ‚ÑƒÑ',
        en: 'Status',
        zh: 'åœ°ä½'
      },
      online_voice_subscribe: {
        ru: 'ÐŸÐ¾Ð´Ð¿Ð¸ÑÐ°Ñ‚ÑŒÑÑ Ð½Ð° Ð¿ÐµÑ€ÐµÐ²Ð¾Ð´',
        uk: 'ÐŸÑ–Ð´Ð¿Ð¸ÑÐ°Ñ‚Ð¸ÑÑ Ð½Ð° Ð¿ÐµÑ€ÐµÐºÐ»Ð°Ð´',
        en: 'Subscribe to translation',
        zh: 'è®¢é˜…ç¿»è¯‘'
      },
      online_voice_success: {
        ru: 'Ð’Ñ‹ ÑƒÑÐ¿ÐµÑˆÐ½Ð¾ Ð¿Ð¾Ð´Ð¿Ð¸ÑÐ°Ð»Ð¸ÑÑŒ',
        uk: 'Ð’Ð¸ ÑƒÑÐ¿Ñ–ÑˆÐ½Ð¾ Ð¿Ñ–Ð´Ð¿Ð¸ÑÐ°Ð»Ð¸ÑÑ',
        en: 'You have successfully subscribed',
        zh: 'æ‚¨å·²æˆåŠŸè®¢é˜…'
      },
      online_voice_error: {
        ru: 'Ð’Ð¾Ð·Ð½Ð¸ÐºÐ»Ð° Ð¾ÑˆÐ¸Ð±ÐºÐ°',
        uk: 'Ð’Ð¸Ð½Ð¸ÐºÐ»Ð° Ð¿Ð¾Ð¼Ð¸Ð»ÐºÐ°',
        en: 'An error has occurred',
        zh: 'å‘ç”Ÿäº†é”™è¯¯'
      },
      online_clear_all_marks: {
        ru: 'ÐžÑ‡Ð¸ÑÑ‚Ð¸Ñ‚ÑŒ Ð²ÑÐµ Ð¼ÐµÑ‚ÐºÐ¸',
        uk: 'ÐžÑ‡Ð¸ÑÑ‚Ð¸Ñ‚Ð¸ Ð²ÑÑ– Ð¼Ñ–Ñ‚ÐºÐ¸',
        en: 'Clear all labels',
        zh: 'æ¸…é™¤æ‰€æœ‰æ ‡ç­¾'
      },
      online_clear_all_timecodes: {
        ru: 'ÐžÑ‡Ð¸ÑÑ‚Ð¸Ñ‚ÑŒ Ð²ÑÐµ Ñ‚Ð°Ð¹Ð¼-ÐºÐ¾Ð´Ñ‹',
        uk: 'ÐžÑ‡Ð¸ÑÑ‚Ð¸Ñ‚Ð¸ Ð²ÑÑ– Ñ‚Ð°Ð¹Ð¼-ÐºÐ¾Ð´Ð¸',
        en: 'Clear all timecodes',
        zh: 'æ¸…é™¤æ‰€æœ‰æ—¶é—´ä»£ç '
      },
      online_change_balanser: {
        ru: 'Ð˜Ð·Ð¼ÐµÐ½Ð¸Ñ‚ÑŒ Ð±Ð°Ð»Ð°Ð½ÑÐµÑ€',
        uk: 'Ð—Ð¼Ñ–Ð½Ð¸Ñ‚Ð¸ Ð±Ð°Ð»Ð°Ð½ÑÐµÑ€',
        en: 'Change balancer',
        zh: 'æ›´æ”¹å¹³è¡¡å™¨'
      },
      online_balanser_dont_work: {
        ru: 'Ð‘Ð°Ð»Ð°Ð½ÑÐµÑ€ ({balanser}) Ð½Ðµ Ð¾Ñ‚Ð²ÐµÑ‡Ð°ÐµÑ‚ Ð½Ð° Ð·Ð°Ð¿Ñ€Ð¾Ñ.',
        uk: 'Ð‘Ð°Ð»Ð°Ð½ÑÐµÑ€ ({balanser}) Ð½Ðµ Ð²Ñ–Ð´Ð¿Ð¾Ð²Ñ–Ð´Ð°Ñ” Ð½Ð° Ð·Ð°Ð¿Ð¸Ñ‚.',
        en: 'Balancer ({balanser}) does not respond to the request.',
        zh: 'å¹³è¡¡å™¨ï¼ˆ{balanser}ï¼‰æœªå“åº”è¯·æ±‚ã€‚'
      },
      online_balanser_timeout: {
        ru: 'Ð‘Ð°Ð»Ð°Ð½ÑÐµÑ€ Ð±ÑƒÐ´ÐµÑ‚ Ð¿ÐµÑ€ÐµÐºÐ»ÑŽÑ‡ÐµÐ½ Ð°Ð²Ñ‚Ð¾Ð¼Ð°Ñ‚Ð¸Ñ‡ÐµÑÐºÐ¸ Ñ‡ÐµÑ€ÐµÐ· <span class="timeout">10</span> ÑÐµÐºÑƒÐ½Ð´.',
        uk: 'Ð‘Ð°Ð»Ð°Ð½ÑÐµÑ€ Ð±ÑƒÐ´Ðµ Ð¿ÐµÑ€ÐµÐºÐ»ÑŽÑ‡ÐµÐ½Ð¾ Ð°Ð²Ñ‚Ð¾Ð¼Ð°Ñ‚Ð¸Ñ‡Ð½Ð¾ Ñ‡ÐµÑ€ÐµÐ· <span class="timeout">10</span> ÑÐµÐºÑƒÐ½Ð´.',
        en: 'Balancer will be switched automatically in <span class="timeout">10</span> seconds.',
        zh: 'å¹³è¡¡å™¨å°†åœ¨<span class="timeout">10</span>ç§’å†…è‡ªåŠ¨åˆ‡æ¢ã€‚'
      }
    });
    Lampa.Template.add('online_prestige_css', "\n        <style>\n        .online-prestige{position:relative;-webkit-border-radius:.3em;-moz-border-radius:.3em;border-radius:.3em;background-color:rgba(0,0,0,0.3);display:-webkit-box;display:-webkit-flex;display:-moz-box;display:-ms-flexbox;display:flex}.online-prestige__body{padding:1.2em;line-height:1.3;-webkit-box-flex:1;-webkit-flex-grow:1;-moz-box-flex:1;-ms-flex-positive:1;flex-grow:1;position:relative}@media screen and (max-width:480px){.online-prestige__body{padding:.8em 1.2em}}.online-prestige__img{position:relative;width:13em;-webkit-flex-shrink:0;-ms-flex-negative:0;flex-shrink:0;min-height:8.2em}.online-prestige__img>img{position:absolute;top:0;left:0;width:100%;height:100%;-o-object-fit:cover;object-fit:cover;-webkit-border-radius:.3em;-moz-border-radius:.3em;border-radius:.3em;opacity:0;-webkit-transition:opacity .3s;-o-transition:opacity .3s;-moz-transition:opacity .3s;transition:opacity .3s}.online-prestige__img--loaded>img{opacity:1}@media screen and (max-width:480px){.online-prestige__img{width:7em;min-height:6em}}.online-prestige__folder{padding:1em;-webkit-flex-shrink:0;-ms-flex-negative:0;flex-shrink:0}.online-prestige__folder>svg{width:4.4em !important;height:4.4em !important}.online-prestige__viewed{position:absolute;top:1em;left:1em;background:rgba(0,0,0,0.45);-webkit-border-radius:100%;-moz-border-radius:100%;border-radius:100%;padding:.25em;font-size:.76em}.online-prestige__viewed>svg{width:1.5em !important;height:1.5em !important}.online-prestige__episode-number{position:absolute;top:0;left:0;right:0;bottom:0;display:-webkit-box;display:-webkit-flex;display:-moz-box;display:-ms-flexbox;display:flex;-webkit-box-align:center;-webkit-align-items:center;-moz-box-align:center;-ms-flex-align:center;align-items:center;-webkit-box-pack:center;-webkit-justify-content:center;-moz-box-pack:center;-ms-flex-pack:center;justify-content:center;font-size:2em}.online-prestige__loader{position:absolute;top:50%;left:50%;width:2em;height:2em;margin-left:-1em;margin-top:-1em;background:url(./img/loader.svg) no-repeat center center;-webkit-background-size:contain;-moz-background-size:contain;-o-background-size:contain;background-size:contain}.online-prestige__head,.online-prestige__footer{display:-webkit-box;display:-webkit-flex;display:-moz-box;display:-ms-flexbox;display:flex;-webkit-box-pack:justify;-webkit-justify-content:space-between;-moz-box-pack:justify;-ms-flex-pack:justify;justify-content:space-between;-webkit-box-align:center;-webkit-align-items:center;-moz-box-align:center;-ms-flex-align:center;align-items:center}.online-prestige__timeline{margin:.8em 0}.online-prestige__timeline>.time-line{display:block !important}.online-prestige__title{font-size:1.7em;overflow:hidden;-o-text-overflow:ellipsis;text-overflow:ellipsis;display:-webkit-box;-webkit-line-clamp:1;line-clamp:1;-webkit-box-orient:vertical}@media screen and (max-width:480px){.online-prestige__title{font-size:1.4em}}.online-prestige__time{padding-left:2em}.online-prestige__info{display:-webkit-box;display:-webkit-flex;display:-moz-box;display:-ms-flexbox;display:flex;-webkit-box-align:center;-webkit-align-items:center;-moz-box-align:center;-ms-flex-align:center;align-items:center}.online-prestige__info>*{overflow:hidden;-o-text-overflow:ellipsis;text-overflow:ellipsis;display:-webkit-box;-webkit-line-clamp:1;line-clamp:1;-webkit-box-orient:vertical}.online-prestige__quality{padding-left:1em;white-space:nowrap}.online-prestige__scan-file{position:absolute;bottom:0;left:0;right:0}.online-prestige__scan-file .broadcast__scan{margin:0}.online-prestige .online-prestige-split{font-size:.8em;margin:0 1em;-webkit-flex-shrink:0;-ms-flex-negative:0;flex-shrink:0}.online-prestige.focus::after{content:'';position:absolute;top:-0.6em;left:-0.6em;right:-0.6em;bottom:-0.6em;-webkit-border-radius:.7em;-moz-border-radius:.7em;border-radius:.7em;border:solid .3em #fff;z-index:-1;pointer-events:none}.online-prestige+.online-prestige{margin-top:1.5em}.online-prestige--folder .online-prestige__footer{margin-top:.8em}.online-prestige-rate{display:-webkit-inline-box;display:-webkit-inline-flex;display:-moz-inline-box;display:-ms-inline-flexbox;display:inline-flex;-webkit-box-align:center;-webkit-align-items:center;-moz-box-align:center;-ms-flex-align:center;align-items:center}.online-prestige-rate>svg{width:1.3em !important;height:1.3em !important}.online-prestige-rate>span{font-weight:600;font-size:1.1em;padding-left:.7em}.online-empty{line-height:1.4}.online-empty__title{font-size:1.8em;margin-bottom:.3em}.online-empty__time{font-size:1.2em;font-weight:300;margin-bottom:1.6em}.online-empty__buttons{display:-webkit-box;display:-webkit-flex;display:-moz-box;display:-ms-flexbox;display:flex}.online-empty__buttons>*+*{margin-left:1em}.online-empty__button{background:rgba(0,0,0,0.3);font-size:1.2em;padding:.5em 1.2em;-webkit-border-radius:.2em;-moz-border-radius:.2em;border-radius:.2em;margin-bottom:2.4em}.online-empty__button.focus{background:#fff;color:black}.online-empty__templates .online-empty-template:nth-child(2){opacity:.5}.online-empty__templates .online-empty-template:nth-child(3){opacity:.2}.online-empty-template{background-color:rgba(255,255,255,0.3);padding:1em;display:-webkit-box;display:-webkit-flex;display:-moz-box;display:-ms-flexbox;display:flex;-webkit-box-align:center;-webkit-align-items:center;-moz-box-align:center;-ms-flex-align:center;align-items:center;-webkit-border-radius:.3em;-moz-border-radius:.3em;border-radius:.3em}.online-empty-template>*{background:rgba(0,0,0,0.3);-webkit-border-radius:.3em;-moz-border-radius:.3em;border-radius:.3em}.online-empty-template__ico{width:4em;height:4em;margin-right:2.4em}.online-empty-template__body{height:1.7em;width:70%}.online-empty-template+.online-empty-template{margin-top:1em}\n        </style>\n    ");
    $('body').append(Lampa.Template.get('online_prestige_css', {}, true));

    function resetTemplates() {
      Lampa.Template.add('online_prestige_full', "<div class=\"online-prestige online-prestige--full selector\">\n            <div class=\"online-prestige__img\">\n                <img alt=\"\">\n                <div class=\"online-prestige__loader\"></div>\n            </div>\n            <div class=\"online-prestige__body\">\n                <div class=\"online-prestige__head\">\n                    <div class=\"online-prestige__title\">{title}</div>\n                    <div class=\"online-prestige__time\">{time}</div>\n                </div>\n\n                <div class=\"online-prestige__timeline\"></div>\n\n                <div class=\"online-prestige__footer\">\n                    <div class=\"online-prestige__info\">{info}</div>\n                    <div class=\"online-prestige__quality\">{quality}</div>\n                </div>\n            </div>\n        </div>");
      Lampa.Template.add('online_does_not_answer', "<div class=\"online-empty\">\n            <div class=\"online-empty__title\">\n                #{online_balanser_dont_work}\n            </div>\n            <div class=\"online-empty__time\">\n                #{online_balanser_timeout}\n            </div>\n            <div class=\"online-empty__buttons\">\n                <div class=\"online-empty__button selector cancel\">#{cancel}</div>\n                <div class=\"online-empty__button selector change\">#{online_change_balanser}</div>\n            </div>\n            <div class=\"online-empty__templates\">\n                <div class=\"online-empty-template\">\n                    <div class=\"online-empty-template__ico\"></div>\n                    <div class=\"online-empty-template__body\"></div>\n                </div>\n                <div class=\"online-empty-template\">\n                    <div class=\"online-empty-template__ico\"></div>\n                    <div class=\"online-empty-template__body\"></div>\n                </div>\n                <div class=\"online-empty-template\">\n                    <div class=\"online-empty-template__ico\"></div>\n                    <div class=\"online-empty-template__body\"></div>\n                </div>\n            </div>\n        </div>");
      Lampa.Template.add('online_prestige_rate', "<div class=\"online-prestige-rate\">\n            <svg width=\"17\" height=\"16\" viewBox=\"0 0 17 16\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\">\n                <path d=\"M8.39409 0.192139L10.99 5.30994L16.7882 6.20387L12.5475 10.4277L13.5819 15.9311L8.39409 13.2425L3.20626 15.9311L4.24065 10.4277L0 6.20387L5.79819 5.30994L8.39409 0.192139Z\" fill=\"#fff\"></path>\n            </svg>\n            <span>{rate}</span>\n        </div>");
      Lampa.Template.add('online_prestige_folder', "<div class=\"online-prestige online-prestige--folder selector\">\n            <div class=\"online-prestige__folder\">\n                <svg viewBox=\"0 0 128 112\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\">\n                    <rect y=\"20\" width=\"128\" height=\"92\" rx=\"13\" fill=\"white\"></rect>\n                    <path d=\"M29.9963 8H98.0037C96.0446 3.3021 91.4079 0 86 0H42C36.5921 0 31.9555 3.3021 29.9963 8Z\" fill=\"white\" fill-opacity=\"0.23\"></path>\n                    <rect x=\"11\" y=\"8\" width=\"106\" height=\"76\" rx=\"13\" fill=\"white\" fill-opacity=\"0.51\"></rect>\n                </svg>\n            </div>\n            <div class=\"online-prestige__body\">\n                <div class=\"online-prestige__head\">\n                    <div class=\"online-prestige__title\">{title}</div>\n                    <div class=\"online-prestige__time\">{time}</div>\n                </div>\n\n                <div class=\"online-prestige__footer\">\n                    <div class=\"online-prestige__info\">{info}</div>\n                </div>\n            </div>\n        </div>");
    }

    var button = "<div class=\"full-start__button selector view--online\" data-subtitle=\"Prestige v".concat(manifest.version, "\">\n        <svg width=\"135\" height=\"147\" viewBox=\"0 0 135 147\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\">\n            <path d=\"M121.5 96.8823C139.5 86.49 139.5 60.5092 121.5 50.1169L41.25 3.78454C23.25 -6.60776 0.750004 6.38265 0.750001 27.1673L0.75 51.9742C4.70314 35.7475 23.6209 26.8138 39.0547 35.7701L94.8534 68.1505C110.252 77.0864 111.909 97.8693 99.8725 109.369L121.5 96.8823Z\" fill=\"currentColor\"/>\n            <path d=\"M63 84.9836C80.3333 94.991 80.3333 120.01 63 130.017L39.75 143.44C22.4167 153.448 0.749999 140.938 0.75 120.924L0.750001 94.0769C0.750002 74.0621 22.4167 61.5528 39.75 71.5602L63 84.9836Z\" fill=\"currentColor\"/>\n        </svg>\n\n        <span>#{title_online}</span>\n    </div>"); // Ð½ÑƒÐ¶Ð½Ð° Ð·Ð°Ð³Ð»ÑƒÑˆÐºÐ°, Ð° Ñ‚Ð¾ Ð¿Ñ€Ð¸ ÑÑ‚Ñ€Ð°Ñ‚Ðµ Ð»Ð°Ð¼Ð¿Ñ‹ Ð³Ð¾Ð²Ð¾Ñ€Ð¸Ñ‚ Ð¿ÑƒÑÑ‚Ð¾

    Lampa.Component.add('online_prestige', component); //Ñ‚Ð¾ Ð¶Ðµ ÑÐ°Ð¼Ð¾Ðµ

    resetTemplates();
    Lampa.Listener.follow('full', function (e) {
      if (e.type == 'complite') {
        var btn = $(Lampa.Lang.translate(button));
        btn.on('hover:enter', function () {
          resetTemplates();
          Lampa.Component.add('online_prestige', component);
          Lampa.Activity.push({
            url: '',
            title: Lampa.Lang.translate('title_online'),
            component: 'online_prestige',
            search: e.data.movie.title,
            search_one: e.data.movie.title,
            search_two: e.data.movie.original_title,
            movie: e.data.movie,
            page: 1
          });
        });
        e.object.activity.render().find('.view--torrent').after(btn);
      }
    }); ///////ONLINE/////////

    Lampa.Params.select('online_proxy_all', '', '');
    Lampa.Params.select('online_proxy_videocdn', '', '');
    Lampa.Params.select('online_proxy_rezka', '', '');
    Lampa.Params.select('online_proxy_kinobase', '', '');
    Lampa.Params.select('online_proxy_collaps', '', '');
    Lampa.Template.add('settings_proxy', "<div>\n        <div class=\"settings-param selector\" data-type=\"input\" data-name=\"online_proxy_all\" placeholder=\"#{online_proxy_placeholder}\">\n            <div class=\"settings-param__name\">#{online_proxy_title}</div>\n            <div class=\"settings-param__value\"></div>\n            <div class=\"settings-param__descr\">#{online_proxy_descr}</div>\n        </div>\n\n        <div class=\"settings-param selector\" data-type=\"input\" data-name=\"online_proxy_videocdn\" placeholder=\"#{online_proxy_placeholder}\">\n            <div class=\"settings-param__name\">Videocdn</div>\n            <div class=\"settings-param__value\"></div>\n        </div>\n\n        <div class=\"settings-param selector\" data-type=\"input\" data-name=\"online_proxy_rezka\" placeholder=\"#{online_proxy_placeholder}\">\n            <div class=\"settings-param__name\">Rezka</div>\n            <div class=\"settings-param__value\"></div>\n        </div>\n\n        <div class=\"settings-param selector\" data-type=\"input\" data-name=\"online_proxy_kinobase\" placeholder=\"#{online_proxy_placeholder}\">\n            <div class=\"settings-param__name\">Kinobase</div>\n            <div class=\"settings-param__value\"></div>\n        </div>\n\n        <div class=\"settings-param selector\" data-type=\"input\" data-name=\"online_proxy_collaps\" placeholder=\"#{online_proxy_placeholder}\">\n            <div class=\"settings-param__name\">Collaps</div>\n            <div class=\"settings-param__value\"></div>\n        </div>\n    </div>");

    function addSettingsProxy() {
      if (Lampa.Settings.main && !Lampa.Settings.main().render().find('[data-component="proxy"]').length) {
        var field = $(Lampa.Lang.translate("<div class=\"settings-folder selector\" data-component=\"proxy\">\n                <div class=\"settings-folder__icon\">\n                    <svg height=\"46\" viewBox=\"0 0 42 46\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\">\n                    <rect x=\"1.5\" y=\"26.5\" width=\"39\" height=\"18\" rx=\"1.5\" stroke=\"white\" stroke-width=\"3\"/>\n                    <circle cx=\"9.5\" cy=\"35.5\" r=\"3.5\" fill=\"white\"/>\n                    <circle cx=\"26.5\" cy=\"35.5\" r=\"2.5\" fill=\"white\"/>\n                    <circle cx=\"32.5\" cy=\"35.5\" r=\"2.5\" fill=\"white\"/>\n                    <circle cx=\"21.5\" cy=\"5.5\" r=\"5.5\" fill=\"white\"/>\n                    <rect x=\"31\" y=\"4\" width=\"11\" height=\"3\" rx=\"1.5\" fill=\"white\"/>\n                    <rect y=\"4\" width=\"11\" height=\"3\" rx=\"1.5\" fill=\"white\"/>\n                    <rect x=\"20\" y=\"14\" width=\"3\" height=\"7\" rx=\"1.5\" fill=\"white\"/>\n                    </svg>\n                </div>\n                <div class=\"settings-folder__name\">#{title_proxy}</div>\n            </div>"));
        Lampa.Settings.main().render().find('[data-component="more"]').after(field);
        Lampa.Settings.main().update();
      }
    }

    if (window.appready) addSettingsProxy();else {
      Lampa.Listener.follow('app', function (e) {
        if (e.type == 'ready') addSettingsProxy();
      });
    } ///////FILMIX/////////

    var network = new Lampa.Reguest();
    var api_url = 'http://filmixapp.cyou/api/v2/';
    var user_dev = '?user_dev_apk=1.1.3&user_dev_id=' + Lampa.Utils.uid(16) + '&user_dev_name=Xiaomi&user_dev_os=11&user_dev_vendor=Xiaomi&user_dev_token=';
    var ping_auth;
    Lampa.Params.select('filmix_token', '', '');
    Lampa.Template.add('settings_filmix', "<div>\n        <div class=\"settings-param selector\" data-name=\"filmix_token\" data-type=\"input\" placeholder=\"#{filmix_param_placeholder}\">\n            <div class=\"settings-param__name\">#{filmix_param_add_title}</div>\n            <div class=\"settings-param__value\"></div>\n            <div class=\"settings-param__descr\">#{filmix_param_add_descr}</div>\n        </div>\n        <div class=\"settings-param selector\" data-name=\"filmix_add\" data-static=\"true\">\n            <div class=\"settings-param__name\">#{filmix_param_add_device}</div>\n        </div>\n    </div>");
    Lampa.Storage.listener.follow('change', function (e) {
      if (e.name == 'filmix_token') {
        if (e.value) checkPro(e.value);else {
          Lampa.Storage.set("filmix_status", {});
          showStatus();
        }
      }
    });

    function addSettingsFilmix() {
      if (Lampa.Settings.main && !Lampa.Settings.main().render().find('[data-component="filmix"]').length) {
        var field = $("<div class=\"settings-folder selector\" data-component=\"filmix\">\n                <div class=\"settings-folder__icon\">\n                    <svg height=\"57\" viewBox=\"0 0 58 57\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\">\n                    <path d=\"M20 20.3735V45H26.8281V34.1262H36.724V26.9806H26.8281V24.3916C26.8281 21.5955 28.9062 19.835 31.1823 19.835H39V13H26.8281C23.6615 13 20 15.4854 20 20.3735Z\" fill=\"white\"/>\n                    <rect x=\"2\" y=\"2\" width=\"54\" height=\"53\" rx=\"5\" stroke=\"white\" stroke-width=\"4\"/>\n                    </svg>\n                </div>\n                <div class=\"settings-folder__name\">Filmix</div>\n            </div>");
        Lampa.Settings.main().render().find('[data-component="more"]').after(field);
        Lampa.Settings.main().update();
      }
    }

    if (window.appready) addSettingsFilmix();else {
      Lampa.Listener.follow('app', function (e) {
        if (e.type == 'ready') addSettingsFilmix();
      });
    }
    Lampa.Settings.listener.follow('open', function (e) {
      if (e.name == 'filmix') {
        e.body.find('[data-name="filmix_add"]').unbind('hover:enter').on('hover:enter', function () {
          var user_code = '';
          var user_token = '';
          var modal = $('<div><div class="broadcast__text">' + Lampa.Lang.translate('filmix_modal_text') + '</div><div class="broadcast__device selector" style="text-align: center">' + Lampa.Lang.translate('filmix_modal_wait') + '...</div><br><div class="broadcast__scan"><div></div></div></div></div>');
          Lampa.Modal.open({
            title: '',
            html: modal,
            onBack: function onBack() {
              Lampa.Modal.close();
              Lampa.Controller.toggle('settings_component');
              clearInterval(ping_auth);
            },
            onSelect: function onSelect() {
              Lampa.Utils.copyTextToClipboard(user_code, function () {
                Lampa.Noty.show(Lampa.Lang.translate('filmix_copy_secuses'));
              }, function () {
                Lampa.Noty.show(Lampa.Lang.translate('filmix_copy_fail'));
              });
            }
          });
          ping_auth = setInterval(function () {
            checkPro(user_token, function () {
              Lampa.Modal.close();
              clearInterval(ping_auth);
              Lampa.Storage.set("filmix_token", user_token);
              e.body.find('[data-name="filmix_token"] .settings-param__value').text(user_token);
              Lampa.Controller.toggle('settings_component');
            });
          }, 10000);
          network.clear();
          network.timeout(10000);
          network.quiet(api_url + 'token_request' + user_dev, function (found) {
            if (found.status == 'ok') {
              user_token = found.code;
              user_code = found.user_code;
              modal.find('.selector').text(user_code);
            } else {
              Lampa.Noty.show(found);
            }
          }, function (a, c) {
            Lampa.Noty.show(network.errorDecode(a, c));
          });
        });
        showStatus();
      }
    });

    function showStatus() {
      var status = Lampa.Storage.get("filmix_status", '{}');
      var info = Lampa.Lang.translate('filmix_nodevice');

      if (status.login) {
        if (status.is_pro) info = status.login + ' - PRO ' + Lampa.Lang.translate('filter_rating_to') + ' - ' + status.pro_date;else if (status.is_pro_plus) info = status.login + ' - PRO_PLUS ' + Lampa.Lang.translate('filter_rating_to') + ' - ' + status.pro_date;else info = status.login + ' - NO PRO';
      }

      var field = $(Lampa.Lang.translate("\n            <div class=\"settings-param\" data-name=\"filmix_status\" data-static=\"true\">\n                <div class=\"settings-param__name\">#{title_status}</div>\n                <div class=\"settings-param__value\">".concat(info, "</div>\n            </div>")));
      $('.settings [data-name="filmix_status"]').remove();
      $('.settings [data-name="filmix_add"]').after(field);
    }

    function checkPro(token, call) {
      network.clear();
      network.timeout(8000);
      network.silent(api_url + 'user_profile' + user_dev + token, function (json) {
        if (json) {
          if (json.user_data) {
            Lampa.Storage.set("filmix_status", json.user_data);
            if (call) call();
          } else {
            Lampa.Storage.set("filmix_status", {});
          }

          showStatus();
        }
      }, function (a, c) {
        Lampa.Noty.show(network.errorDecode(a, c));
      });
    }
  }

  if (!window.online_prestige && Lampa.Manifest.app_digital >= 155) startPlugin();

})();