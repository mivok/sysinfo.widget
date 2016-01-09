command: "/usr/local/bin/python sysinfo.widget/sysinfo.py"

## Configuration

# How often to refresh the widget - if this is too short, then the widget will
# fail to refresh because the commands take too long to run (especially the
# ping commands)
refreshFrequency: 5000

# Which modules to enable
enabled_modules: [
    "cpu_mem",
    "top_procs",
    "disk_space",
    "network",
    "wifi",
    "bandwidth",
    "ping",
    "running_vms"
]

## Helper functions
humanize: (value) ->
    # Convert a value to human readable numbers (e.g. 1024 -> 1k)
    suffixes = "kMGT"
    idx = -1
    while value >= 1024
        value = value / 1024.0
        idx += 1
    if idx >= 0
        suffix = suffixes[idx]
    else
        suffix = ""

    # toPrecision does significant figures, but values >1000 turn into
    # scientific notation, and we don't need to worry about precision there,
    # so just print the value as is with no decimals.
    if value >= 1000
        "#{value.toFixed(0)}#{suffix}"
    else
        "#{value.toPrecision(3)}#{suffix}"

## Module definitions
modules: {
    "cpu_mem": {"icon": "laptop", "title": "CPU/Memory"},
    "top_procs": {"icon": "trophy", "title": "Top Processes"}
    "disk_space": {"icon": "hdd-o", "title": "Disk space"}
    "network": {"icon": "cloud", "title": "Network"}
    "wifi": {"icon": "wifi", "title": "Wifi"}
    "bandwidth": {"icon": "download", "title": "Bandwidth"}
    "ping": {"icon": "industry", "title": "Ping"}
    "running_vms": {"icon": "server", "title": "Running VMs"}
}
## Rendering functions
render_module: (module) ->
    info = this.modules[module]
    """
    <h2><i class=\"fa fa-#{info['icon']}\"></i> #{info['title']}</h2>
    #{this["render_#{module}"]()}
    """

render_cpu_mem: ->
    """
    <p>User: <span id="cpu-user"></span>%, System: <span id="cpu-system"></span>%</p>
    <p>Free: <span id="memory-free"></span>B, Wired: <span id="memory-wired"></span>B,
       Active: <span id="memory-active"></span>B, Inactive:
       <span id="memory-inactive"></span>B</p>
    """

update_cpu_mem: (data, domEl) ->
    for i in ['user', 'system']
        $(domEl).find("#cpu-#{i}").text(data['cpu'][i])
    for i in ['free', 'wired', 'active', 'inactive']
        $(domEl).find("#memory-#{i}").text(data['memory'][i])

render_top_procs: ->
    """<table id="top-procs"></table>"""

update_top_procs: (data, domEl) ->
    @run("ps axro 'pid, %cpu, ucomm'", (err, output) ->
        e = $(domEl).find("#top-procs")
        e.empty()
        top_procs = (p.match(/\S+/g) for p in output.split("\n"))[1..6]
        for p in top_procs
            e.append("""<tr>
                <td class="pid">#{p[0]}</td>
                <td class="cpu">#{p[1]}</td>
                <td class="name">#{p[2]}</td>
            </tr>""")
    )

render_disk_space: ->
    """
    <p>Used: <span id="disk-used"></span>B,
    Free: <span id="disk-free"></span>,
    Total: <span id="disk-total"></span>B
    (<span id="disk-percent"></span>%)</p>
    """

update_disk_space: (data, domEl) ->
    for i in ['used', 'free', 'total']
        $(domEl).find("#disk-#{i}").text(data['disk']['human'][i])
    $(domEl).find("#disk-percent").text(data['disk']['percent'])

render_wifi: ->
    """<dl id="wifi"></dl>"""

update_wifi: (data, domEl) ->
    e = $(domEl).find("#wifi")
    @run("/System/Library/PrivateFrameworks/Apple80211.framework/Versions/Current/Resources/airport -I", (err, output) ->
        wifi_info = {}
        for line in output.split("\n")
            m = line.match(/^\s*(\S+): (.*)/)
            if m
                wifi_info[m[1]] = m[2]
        if wifi_info['agrCtlRSSI']
            wifi_info["SNR"] = parseInt(wifi_info["agrCtlRSSI"]) - parseInt(wifi_info["agrCtlNoise"])
        if wifi_info['channel']
            wifi_info['channel'] = wifi_info['channel'].replace(/,-?1/, '')
        if wifi_info['AirPort'] == 'Off'
            e.html("<dt>Wifi</dt><dd>Off</dd>")
        else
            e.html("""
            <dl>
                <dt>SSID</dt><dd>#{wifi_info['SSID']}</dd>
                <dt>BSSID</dt><dd>#{wifi_info['BSSID']}</dd>
                <dt>Speed</dt><dd>#{wifi_info['lastTxRate']}Mbps /
                    #{wifi_info['maxRate']}Mbps</dd>
                <dt>SNR</dt><dd>#{wifi_info['SNR']}dB</dd>
                <dt>Channel</dt><dd>#{wifi_info['channel']}</dd>
            </dl>
            """)
    )

render_network: ->
    """<dl id="network"></dl><dl id="dns"></dl>"""

update_network: (data, domEl) ->
    e = $(domEl).find("#network")
    @run("ifconfig -a", (err, output) ->
        ip_info = {}
        cur_if = ""
        for line in output.split("\n")
            m = line.match(/^([a-z0-9]+):/)
            if m
                cur_if  = m[1]
                ip_info[cur_if] = []
                continue
            m = line.match(/^\s+inet6? ([0-9a-f.:]+)/)
            if m and not m[1].startsWith("fe80")
                ip_info[cur_if].push(m[1])
        e.empty()
        for iface in Object.keys(ip_info).sort()
            ips = ip_info[iface]
            if ips.length > 0  and iface != 'lo0'
                e.append("<dt>#{iface}</dt><dd>#{ips.join(", ")}</dd>")
    )
    f = $(domEl).find("#dns")
    @run("cat /etc/resolv.conf", (err, output) ->
        nameservers = []
        for line in output.split("\n")
            m = line.match(/^nameserver (\S+)/)
            if m
                nameservers.push(m[1])
        f.html("<dt>DNS</dt><dd>#{nameservers.join(", ")}</dd>")
    )

render_bandwidth: ->
    """<dl id="bandwidth"></dl>"""

update_bandwidth: (data, domEl) ->
    e = $(domEl).find("#bandwidth")
    window.sysinfo.bandwidth ||= {}
    humanize = this.humanize
    @run("netstat -inb", (err, output) ->
        new_bw = {"timestamp": Date.now(), "bandwidth": {}}
        for line in output.split("\n")[1..]
            parts = line.split(/\s+/)
            if not parts[0]
                continue
            if new_bw["bandwidth"][parts[0]]
                # netstat -ib duplicates lines for each interface (showing
                # different IPs), so we only need one of each.
                continue
            if parts[0] == 'lo0'
                # Skip localhost
                continue
            new_bw["bandwidth"][parts[0]] = [parts[6], parts[9]]

        old_bw = window.sysinfo.bandwidth
        if old_bw?
            time_diff = (new_bw['timestamp'] - old_bw['timestamp']) / 1000
            if time_diff < 10
                # We don't care about showing bandwidth if more than 10 seconds
                # have passed between iterations
                e.empty()
                for k in Object.keys(old_bw['bandwidth']).sort()
                    oldv = old_bw['bandwidth'][k]
                    newv = new_bw['bandwidth'][k] || [0,0]
                    bytes_in_raw  = (parseInt(newv[0], 10) - \
                        parseInt(oldv[0], 10)) / time_diff
                    bytes_out_raw = (parseInt(newv[1], 10) - \
                        parseInt(oldv[1], 10)) / time_diff
                    bytes_in = humanize(bytes_in_raw)
                    bytes_out = humanize(bytes_out_raw)
                    unless bytes_in_raw == 0 and bytes_out_raw == 0
                        e.append("""
                            <dt>#{k}</dt>
                            <dd>IN #{bytes_in}Bps / OUT #{bytes_out}Bps</dd>
                            """)
        window.sysinfo['bandwidth'] = new_bw
    )

render_ping: ->
    """<dl id="ping" class="wide"></dl>"""

update_ping: (data, domEl) ->
    e = $(domEl).find("#ping")
    e.empty()
    for p in this.data['ping']
        if p['timeout']
            e.append("<dt>#{p.host}</dt><dd class=\"error\">TIMEOUT</dd>")
        else
            e.append("<dt>#{p.host}</dt><dd>#{p.rtt}</dd>")

render_running_vms: ->
    """<ul id="runningvms" class="blank"></ul>"""

update_running_vms: (data, domEl) ->
    e = $(domEl).find("#runningvms")
    e.empty()
    for i in data['vms']
        e.append("<li>#{i}</li>")

render: (output) ->
    window.sysinfo ||= {}
    this.data = $.parseJSON(output)
    """
    <div class="background"></div>
    <h1>#{this.data['hostname']}</h1>
    #{(this.render_module(m) for m in this.enabled_modules).join(" ")}
    """

update: (output, domEl) ->
    data = $.parseJSON(output)
    for module in this.enabled_modules
        this["update_#{module}"](data, domEl)

style: """
    color: #ddd
    font-family: Helvetica Neue
    font-size: 9pt
    font-weight: 300
    line-height: 1.5
    width: 250px
    text-align: left
    padding: 10px
    margin: 0
    right: 0
    top: 0
    height: 100%

    .background
        background: rgba(#000, 0.50)
        // The transform prevents an issue where blur doesn't
        // work as soon as you go offscreen
        width: 100%
        height: 100%
        -webkit-transform: scale(1.3)
        -webkit-transform-origin: top left
        -webkit-filter: blur(15px)
        position: absolute
        top: -25px
        left: -25px
        z-index: -1

    pre
        font-family: Helvetica Neue

    h1
        font-size: 14pt
        font-weight: 300
        margin: 0
        margin-bottom: 0.5em
        text-align: center

    h2
        font-size: 12pt
        font-weight: 300
        margin: 0
        margin-top: 0.5em
        margin-bottom: 0.25em
        border-bottom: 1px solid white

    p
        margin: 0

    table#top-procs
        border-spacing: 0
        width: 100%

    table#top-procs td
        padding-top: 0
        padding-bottom: 0

    table#top-procs td.pid
        width: 5ex
        text-align: right

    table#top-procs td.cpu
        text-align: right
        width: 7ex

    table#top-procs td.name
        padding-left: 0.5em

    dl
        margin: 0

    dd
        float: left
        margin: 0
        width: 75%

    dt
        float: left
        margin: 0
        width: 25%
        font-weight: 500

    dl:after
        display: block
        clear: both
        content: ''

    dl.wide dd, dl.wide dt
        width: 50%

    .error
        color: red

    ul.blank
        list-style: none
        margin: 0
        padding: 0


"""
