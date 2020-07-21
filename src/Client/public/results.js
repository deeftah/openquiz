(function($) {
    var re = /([^&=]+)=?([^&]*)/g;
    var decode = function(str) {
        return decodeURIComponent(str.replace(/\+/g, ' '));
    };
    $.parseParams = function(query) {
        var params = {}, e;
        if (query) {
            if (query.substr(0, 1) == '?') {
                query = query.substr(1);
            }

            while (e = re.exec(query)) {
                var k = decode(e[1]);
                var v = decode(e[2]);
                if (params[k] !== undefined) {
                    if (!$.isArray(params[k])) {
                        params[k] = [params[k]];
                    }
                    params[k].push(v);
                } else {
                    params[k] = v;
                }
            }
        }
        return params;
    };
})(jQuery);

function getL10n() {
    function getLang() {
        for (var i = 0; i < window.navigator.languages.length; i++) {
            var lang =  window.navigator.languages[i]
            if (lang.startsWith("en")) {return "en"}
            if (lang.startsWith("ru")) {return "ru"}
            if (lang.startsWith("uk")) {return "uk"}
        }
        return "en"
    }

    var lang = getLang()

    function l (en, ru, uk){
        if (lang == "ru") { return ru }
        if (lang == "uk") { return uk }
        return en
    }

    var l10n = {
        results: l ("Results", "Результаты", "Результати"),
        team: l ("Team", "Команда", "Команда"),
        points: l ("Points", "Очки", "Очки"),
        place: l ("Place", "Место", "Місце"),
        toShortView: l ('less details', "скрыть детали", "сховати подробицi"),
        toFullView: l ('more details', "показать детали", "показати подробицi"),
    }

    return l10n
}

function shortTable(data, l10n)
{
    var $topContainer = $('<div/>', {'style': 'display: grid'})
    var $container = $('<div/>', {'class': 'table-container'}).appendTo($topContainer)

    var $table = $('<table>', {'class': 'table is-hoverable'}).appendTo($container)
    $table
    .append('<thead>').children('thead')
    .append('<tr/>').children('tr').append('<th>#</th><th>'+l10n.team+'</th><th>'+l10n.points+'</th><th>'+l10n.place+'</th>')

    var $body = $table.append('<tbody>').children('tbody')

    for (var i = 0; i < data.Teams.length; i++){
        var team = data.Teams[i]

        var $row = $('<tr/>')
            .append('<td>'+team.TeamId+'</td>')
            .append('<td>'+team.TeamName+'</td>');

        $('<td>', {'text': team.Points, 'style': 'text-align: center'}).appendTo($row)
        $('<td>', {'text': (team.PlaceFrom == team.PlaceTo) ? team.PlaceFrom : team.PlaceFrom + '-' + team.PlaceTo, 'style': 'text-align: center'}).appendTo($row)
        $body.append($row)
    }

    return $topContainer
}

function fullTable(data, l10n)
{
    var $topContainer = $('<div/>', {'style': 'display: grid'})
    var $container = $('<div/>', {'class': 'table-container'}).appendTo($topContainer)

    var $table = $('<table>', {'class': 'table is-hoverable is-fullwidth'}).appendTo($container)
    var $thead = $('<thead>').appendTo($table)
    var $hRow = $('<tr/>').appendTo($thead)
    $('<th>', {'text': l10n.team, 'colspan': 2}).appendTo($hRow)
    for (var i = 0; i<data.Questions.length; i++){
        var qw = data.Questions[i]
        $hRow.append('<th>'+qw.Name+'</th>')
    }
    $hRow.append('<th>'+l10n.points+'</th>')
    $hRow.append('<th>'+l10n.place+'</th>')

    var $tbody = $('<tbody>').appendTo($table)
    for (var i = 0; i < data.Teams.length; i++){
        var team = data.Teams[i]

        var $row = $('<tr/>');
        $('<td>'+team.TeamId+'</td>').appendTo($row)
        $('<th>', {'text': team.TeamName, 'style': 'white-space: nowrap; font-weight: normal'}).appendTo($row)

        for (var j = 0; j<data.Questions.length; j++){
            var qw = data.Questions[j]
            var key = JSON.stringify(qw.Key)
            var result = team.Details[key]
            var txt = result ? result : ""
            $row.append('<td>'+txt+'</td>')
        }

        $('<td>', {'text': team.Points, 'style': 'text-align: center'}).appendTo($row)
        $('<td>', {'text': (team.PlaceFrom == team.PlaceTo) ? team.PlaceFrom : team.PlaceFrom + '-' + team.PlaceTo, 'style': 'text-align: center'}).appendTo($row)

        $tbody.append($row)
    }

    return $topContainer
}
function displayResults (data, teamId, l10n, full) {
    var $menu = $('<div/>', {});
    if (full){
        $('<a>'+l10n.toShortView+'</a>').click(function() {displayResults(data, teamId, l10n, false)}).appendTo($menu)
    } else{
        $('<a>'+l10n.toFullView+'</a>').click(function() {displayResults(data, teamId, l10n, true)}).appendTo($menu)
    }

    $table = full ? fullTable(data, l10n) : shortTable(data, l10n)

    if (teamId){
        let $el = $table.find('tr td:first-child:contains("'+teamId+'")').parent()
        $el.find('td, th').css('font-weight', 'bold')
        $el
        .clone()
        .find('td, th').css('border-bottom', 'double')
        .parent()
        .prependTo($table.find('tbody'))
    }

    var vw = Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0)

    if (vw >= 800){
        $table.find('table').stickyTable();
    }

    $('#mainContent').empty().append($menu).append($table)
}

$(document).ready(function() {
    var defaults = {quiz : 0, quizName : "", quizImg : "", teamId : 0, token : ""}
    var parameters = $.parseParams(location.search.substring(1))
    var settings = $.extend({}, defaults, parameters);

    var l10n = getL10n()
    //alert(JSON.stringify(l10n))

    var title = settings.quizName + " - " + l10n.results
    document.title = title

    $("meta[name='description']").attr("content", title)
    $("meta[property='og\\:description']").attr("content", title)
    $("meta[property='og\\:url']").attr("content", window.location.href)

    if (settings.quizImg != ""){
        $("#quizLogo").attr("src", "https://www.open-quiz.com/media/" + settings.quizImg);
    }
    $("#quizName").text(settings.quizName);

    if (settings.who != "emb"){
        $(".hero-head").show()
        $(".hero-foot").show()
    }

    var url = "https://www.open-quiz.com/static/" + settings.quiz + "-" + settings.token + "/results.json"
    $.getJSON(url, function(data) {displayResults(data, settings.teamId, l10n)});
});

