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

    def memory_info(self):
        # Memory
        meminfo = psutil.phymem_usage()
        return {
            "free": Util.humanize(meminfo.free),
            "wired": Util.humanize(meminfo.wired),
            "active": Util.humanize(meminfo.active),
            "inactive": Util.humanize(meminfo.inactive)

        }

i = Info()
print json.dumps(i.data(), indent=2)
