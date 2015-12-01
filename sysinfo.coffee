command: "/usr/local/bin/python ./sysinfo.py"

render: (output) ->
    data = $.parseJSON(output)
    """
    <h1>#{data['hostname']}</h1>
    <h2><i class="fa fa-laptop"></i> CPU</h2>
    <p>#{data['cpu']['user']}% User / #{data['cpu']['system']}% System</p>
    """

refreshFrequency: 5000

style: """
    background: rgba(#000, 0.35)
    background-size: 176px 84px
    color: #eee
    font-family: Helvetica Neue
    font-size: 9pt
    line-height: 1.5
    width: 250px
    text-align: left
    padding: 10px
    margin: 0
    right: 270px
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

    p
        margin: 0
"""
