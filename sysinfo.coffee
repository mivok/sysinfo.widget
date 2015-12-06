command: "/usr/local/bin/python ./sysinfo.py"

humanize: (value) ->
    suffixes = "KMGT"
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
    # so just print the value as is.
    if value >= 1000
        "#{value}#{suffix}"
    else
        "#{value.toPrecision(3)}#{suffix}"

render: (output) ->
    window.sysinfo ||= {}

    data = $.parseJSON(output)
    # Top
    top_procs = ( """<tr>
        <td class="pid">#{i['pid']}</td>
        <td class="cpu">#{i['cpu']}</td>
        <td class="name">#{i['name']}</td>
    </tr>""" for i in data['top'] ).join('\n')
    # Wifi
    if data['wifi']['AirPort'] == 'Off'
        wifi_info = "<dt>Wifi</dt><dd>Off</dd>"
    else
        wifi_info = """
        <dt>SSID</dt><dd>#{data['wifi']['SSID']}</dd>
        <dt>BSSID</dt><dd>#{data['wifi']['BSSID']}</dd>
        <dt>Speed</dt><dd>#{data['wifi']['lastTxRate']}Mbps /
            #{data['wifi']['maxRate']}Mbps</dd>
        <dt>SNR</dt><dd>#{data['wifi']['SNR']}dB</dd>
        <dt>Channel</dt><dd>#{data['wifi']['channel']}</dd>
        """
    # IP
    ip_info = []
    for iface in Object.keys(data['ip']).sort()
        ips = data['ip'][iface]
        if ips.length > 0  and iface != 'lo0'
            ip_info.push("<dt>#{iface}</dt><dd>#{ips.join(", ")}</dd>")
    ip_info = ip_info.join(" ")
    # Bandwidth
    window.sysinfo.bandwidth ||= {}
    old_bw = window.sysinfo.bandwidth
    new_bw = data['bandwidth']
    bw = []
    if old_bw?
        time_diff = new_bw['timestamp'] - old_bw['timestamp']
        if time_diff < 10
            # We don't care about showing bandwidth if more than 10 seconds
            # have passed between iterations
            for k in Object.keys(old_bw['bandwidth']).sort()
                oldv = old_bw['bandwidth'][k]
                newv = new_bw['bandwidth'][k] || [0,0]
                bytes_in_raw  = (parseInt(newv[0], 10) - \
                    parseInt(oldv[0], 10)) / time_diff
                bytes_out_raw = (parseInt(newv[1], 10) - \
                    parseInt(oldv[1], 10)) / time_diff
                bytes_in = this.humanize(bytes_in_raw)
                bytes_out = this.humanize(bytes_out_raw)
                unless bytes_in_raw == 0 and bytes_out_raw == 0
                    bw.push("""
                        <dt>#{k}</dt>
                        <dd>IN #{bytes_in}Bps / OUT #{bytes_out}Bps</dd>
                        """)
    window.sysinfo['bandwidth'] = new_bw
    bw_info = bw.join("")

    # Ping
    ping_info = []
    for p in data['ping']
        if p['timeout']
            ping_info.push("<dt>#{p.host}</dt><dd class=\"error\">TIMEOUT</dd>")
        else
            ping_info.push("<dt>#{p.host}</dt><dd>#{p.rtt}</dd>")
    ping_info = ping_info.join("")


    """
    <h1>#{data['hostname']}</h1>

    <h2><i class="fa fa-laptop"></i> CPU / Memory</h2>
    <p>User: #{data['cpu']['user']}%, System: #{data['cpu']['system']}%</p>
    <p>Free: #{data['memory']['free']}B, Wired: #{data['memory']['wired']}B,
       Active: #{data['memory']['active']}B, Inactive:
       #{data['memory']['inactive']}B</p>

    <h2><i class="fa fa-trophy"></i> Top processes</h2>
    <table class="top_procs">
        #{top_procs}
    </table>

    <h2><i class="fa fa-hdd-o"></i> Disk space</h2>
    <p>Used: #{data['disk']['human']['used']}B,
    Free: #{data['disk']['human']['free']},
    Total: #{data['disk']['human']['total']}B
    (#{data['disk']['percent']}%)</p>

    <h2><i class="fa fa-cloud"></i> Network</h2>
    <dl>
        #{ip_info}
        <dt>DNS</dt><dd>#{data['nameservers'].join(", ")}</dd>
    </dl>

    <h2><i class="fa fa-wifi"></i> Wifi</h2>
    <dl>#{wifi_info}</dl>

    <h2><i class="fa fa-download"></i> Bandwidth</h2>
    <dl>#{bw_info}</dl>

    <h2><i class="fa fa-industry"></i> Ping</h2>
    <dl class="wide">#{ping_info}</dl>

    <h2><i class="fa fa-server"></i> Running VMs</h2>
    <ul class="blank">
        #{("<li>#{i}</li>" for i in data['vms']).join("")}
    </ul>




    """

refreshFrequency: 5000

style: """
    background: rgba(#000, 0.45)
    background-size: 176px 84px
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

    table.top_procs
        border-spacing: 0
        width: 100%

    table.top_procs td
        padding-top: 0
        padding-bottom: 0

    table.top_procs td.pid
        width: 5ex
        text-align: right

    table.top_procs td.cpu
        text-align: right
        width: 7ex

    table.top_procs td.name
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
