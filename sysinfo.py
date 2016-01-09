#!/usr/bin/env python
import json
import os
import re
import shlex
import subprocess
import socket
import time

import psutil

class Util(object):

    @staticmethod
    def run(cmd, split=True, ignore_errors=True):
        # Wrapper around subprocess
        parts = shlex.split(cmd, posix=True)
        try:
            output = subprocess.check_output(parts)
        except subprocess.CalledProcessError, e:
            if ignore_errors:
                output = e.output
            else:
                raise

        if split:
            output = output.split("\n")
            if output[-1] == "":
                output.pop()
        return output

    @staticmethod
    def run_parallel(cmds, split=True):
        procs = {}
        output = {}
        for name, cmd in cmds.items():
            procs[name] = subprocess.Popen(shlex.split(cmd, posix=True),
                                           stdout=subprocess.PIPE,
                                           stderr=subprocess.STDOUT,
                                           close_fds=True)

        while procs:
            for name, p in procs.items():
                if p.poll() is not None: # process ended
                    out = p.stdout.read()
                    if split:
                        out = out.split("\n")
                        if out[-1] == "":
                            out.pop()
                    output[name] = out
                    p.stdout.close()
                    del procs[name]
            time.sleep(0.01)

        return output

    @staticmethod
    def humanize(value):
        suffixes = "KMGT"
        idx = -1
        while value >= 1024:
            value = value / 1024.0
            idx += 1
        if idx >= 0:
            suffix = suffixes[idx]
        else:
            suffix = ""

        # %g does significant figures, but values >1000 turn into scientific
        # notation, and we don't need decimals there anyway, so use %d instead
        if value >= 1000:
            format_str = "%d%s"
        else:
            format_str = "%.3g%s"

        return format_str % (value, suffix)

class Info(object):
    def data(self):
        data = {}
        methods = [i for i in dir(self) if i.endswith('_info')]
        for m in methods:
            key = m.replace('_info', '')
            data[key] = getattr(self, m)()
        return data

    def cpu_info(self):
        procs = [p for p in psutil.process_iter()]
        # First run - invalid values
        cpu = psutil.cpu_times_percent()
        # Wait
        time.sleep(0.5)
        # Next run - gives values since first run
        cpu = psutil.cpu_times_percent()
        data = {
            "user": cpu.user,
            "system": cpu.system
        }
        return data

    def top_info(self):
        # Top processes
        top_procs = [p.split() for p in
                     Util.run("ps axro 'pid, %cpu, ucomm'")[1:6]]
        return [ { "pid": p[0], "cpu": p[1], "name": p[2] }
            for p in top_procs ]

    def memory_info(self):
        # Memory
        meminfo = psutil.phymem_usage()
        return {
            "free": Util.humanize(meminfo.free),
            "wired": Util.humanize(meminfo.wired),
            "active": Util.humanize(meminfo.active),
            "inactive": Util.humanize(meminfo.inactive)

        }

    def hostname_info(self):
        return socket.gethostname()

    def disk_info(self):
        stats = os.statvfs("/")
        data = {"bytes": {}, "human": {}}
        b = data["bytes"]
        b["free"] = stats.f_bavail * stats.f_frsize
        b["total"] = stats.f_blocks * stats.f_frsize
        b["used"] = b["total"] - b["free"]
        data["percent"] = (100 * b["used"] / b["total"])
        for k, v in b.items():
            data["human"][k] = Util.humanize(v)
        return data

    def ip_info(self):
        data = {}
        for line in Util.run("ifconfig -a"):
            m = re.match("([a-z0-9]+):", line)
            if m:
                cur_if = m.group(1)
                data[cur_if] = []
                continue
            line = line.strip()
            if line.startswith("inet"):
                # IP Address info
                parts = line.split()
                if parts[1].startswith("fe80"):
                    continue
                data[cur_if].append(re.sub("%.*$", "", parts[1]))
        return data

    def wifi_info(self):
        data = {}
        airportcmd = "/System/Library/PrivateFrameworks/Apple80211.framework/Versions/Current/Resources/airport"
        for line in Util.run("%s -I" % airportcmd):
            line = line.strip()
            parts = line.split(':', 1)
            data[parts[0]] = parts[1].strip()
        if 'agrCtlRSSI' in data:
            data["SNR"] = int(data["agrCtlRSSI"]) - int(data["agrCtlNoise"])
        if 'channel' in data:
            data['channel'] = data['channel'].replace(',-1', '')
        return data

    def nameservers_info(self):
        data = []
        try:
            with open("/etc/resolv.conf") as fh:
                for line in fh:
                    line = line.strip()
                    parts = line.split()
                    if parts[0] == 'nameserver':
                        data.append(parts[1])
        except IOError:
            pass
        return data

    def bandwidth_info(self):
        data = {}
        lines = Util.run('netstat -inb')[1:]
        for line in lines:
            parts = line.split()
            if parts[0] in data:
                # netstat -ib duplicates lines for each interface (showing
                # different IPs), so we only need one of each.
                continue
            if parts[0] == 'lo0':
                # Skip localhost
                continue
            data[parts[0]] = (parts[6], parts[9])
        return {"timestamp": time.time(), "bandwidth": data}

    def ping_info(self):
        hosts = ['8.8.8.8', 'www.verizon.com']

        # Add default route to the list of hosts to ping
        for line in Util.run("netstat -nr"):
            parts = line.split()
            if parts and parts[0] == 'default' and '.' in parts[1]:
                hosts.insert(0, parts[1])
                if parts[1] == '192.168.1.1':
                    # Wifi point at home
                    hosts.insert(1, '192.168.1.4')
                break

        results = Util.run_parallel({h: 'ping -n -c 1 -W 1 %s' % h for h in hosts})
        data = []
        for host in hosts:
            try:
                out = results[host][-1]
            except IndexError:
                out = ""
            if out.startswith('round-trip'):
                rtt = "%sms" % out.split('/')[4]
                data.append({"host": host, "rtt": rtt})
            else:
                data.append({"host": host, "timeout": True})
        return data

    def vms_info(self):
        # Virtualbox
        vms = [i.split('"')[1] for i in Util.run(
            "/usr/local/bin/VBoxManage list runningvms")]
        for n, vm in enumerate(vms):
            m = re.match("^(.+?)_([^_]+)_[0-9_]+$", vm)
            if m:
                # We have a vagrant machine
                vms[n] = "%s (%s)" % (m.group(1), m.group(2))
            vms[n] = "vbox - %s" % vms[n]
        return vms

i = Info()
print json.dumps(i.data(), indent=2)
