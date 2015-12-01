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
        for p in procs:
            try:
                p.get_cpu_percent()
            except (psutil.AccessDenied, psutil.NoSuchProcess):
                pass
        # Wait
        time.sleep(0.5)
        # Next run - gives values since first run
        cpu = psutil.cpu_times_percent()
        for p in procs:
            try:
                p._cpu_percent = p.get_cpu_percent()
            except (psutil.AccessDenied, psutil.NoSuchProcess):
                p._cpu_percent = 0.0

        data = {
            "user": cpu.user,
            "system": cpu.system
        }
        # Top processes
        top_procs = sorted(procs, key=lambda p: p._cpu_percent, reverse=True)[:5]
        data["top"] = [
            {
                "pid": p.pid,
                "cpu": p._cpu_percent,
                "name": p.name()
            }
            for p in top_procs
        ]
        return data

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
                data[cur_if] = {}
                continue
            if "status: active" in line:
                # Interface is active
                data[cur_if]['active'] = True
                continue
            line = line.strip()
            if line.startswith("inet"):
                # IP Address info
                parts = line.split()
                data[cur_if].setdefault(parts[0],[]).append(parts[1])
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

i = Info()
print json.dumps(i.data(), indent=2)
