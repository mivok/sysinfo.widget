import {
  React, run, css, styled,
} from 'uebersicht';

// React hooks are part of the React object, so we don't import them like we
// would in normal react, but just set variables instead
const { useState } = React;
const { useEffect } = React;
const { useRef } = React;

// Configuration
const moduleConfig = {
  ping: {
    // Which hosts to ping
    hosts: [
      'default_route',
      '8.8.8.8',
      'www.verizon.com',
    ],
    // Additional hosts to ping if at home
    // If your default route matches this, then ping additional hosts at
    // home
    home_router: '192.168.1.1',
    additional_home_hosts: ['192.168.1.3'],
  },
};

//
// Helper functions
//

// Keep track of the number of running timers
let TimerCount = 0;

// Wrapper around recurringTimer for use as a react hook (use this for setting
// a recurring timer inside a functional react component)
const useRecurringTimer = (interval, callback) => {
  useEffect(() => {
    const timer = setInterval(callback, interval);
    TimerCount += 1;
    // Run the first iteration immediately
    callback();

    // Cancel the recurring timer when cleaning up
    return () => {
      clearInterval(timer);
      TimerCount -= 1;
    };
  }, []);
};

// Wrapper around useRecurringTimer for running a command at regular intervals
// and doing something with the output
const useTimedCommand = (interval, command, callback) => {
  useRecurringTimer(interval, () => run(command).then(callback));
};

// Turns a size into human units (e.g. 1000 = 1k)
const humanize = (value) => {
  // Convert a value to human readable numbers (e.g. 1024 -> 1k)
  const suffixes = 'kMGT';
  let currentValue = value;
  let idx = -1;
  let suffix = '';
  while (currentValue >= 1024) {
    currentValue /= 1024.0;
    idx += 1;
  }
  if (idx >= 0) {
    suffix = suffixes[idx];
  }

  // toPrecision does significant figures, but values >1000 turn into
  // scientific notation, and we don't need to worry about precision there,
  // so just print the value as is with no decimals.
  if (currentValue >= 1000) {
    return `${currentValue.toFixed(0)}${suffix}`;
  }
  return `${currentValue.toPrecision(3)}${suffix}`;
};

//
// Styles
//
const baseColor = '#0df';
const textColor = '#ddd';

export const className = {
  color: textColor,
  fontFamily: 'Helvetica Neue',
  fontSize: '9pt',
  fontWeight: 300,
  lineHeight: 1.2,
  width: '250px',
  textAlign: 'left',
  padding: '10px',
  margin: 0,
  right: 0,
  top: 0,
  height: '100%',
};

const Background = styled.div({
  background: 'rgba(0, 0, 0, 0.50)',
  width: '100%',
  height: '100%',
  // The transform prevents an issue where blur doesn't
  // work as soon as you go offscreen
  transform: 'scale(1.3)',
  transformOrigin: 'top left',
  filter: 'blur(15px)',
  position: 'absolute',
  top: '-25px',
  left: '-25px',
  zIndex: '-1',
});

// For the hostname at the very top of the display
const TopLevelHeader = styled.h1({
  fontSize: '14pt',
  fontWeight: 300,
  margin: 0,
  marginBottom: '0.5em',
  textAlign: 'center',
});

const ModuleTitle = styled.h2({
  fontSize: '12pt',
  fontWeight: 300,
  margin: 0,
  marginTop: '0.5em',
  marginBottom: '0.25em',
  // The 8 at the end means 50% opacity
  borderBottom: `1px solid ${baseColor}8`,
});

const BarHeader = styled.p({
  margin: 0,
  textAlign: 'center',
});

const Bar = styled.div({
  width: '100%',
  border: `1px solid ${textColor}`,
  borderRadius: '4px',
  height: '5px',
  position: 'relative',
});

const Segment = styled.div(
  {
    height: '5px',
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderRadius: '4px',
    position: 'absolute',
  },
  ({ width }) => ({
    width: `${width}%`,
  }),
  ({ color, width }) => {
    switch (color) {
      case 'auto':
        // Audo sets the color to green/yellow/red based on a threshold
        if (width > 80) {
          // Red
          return { backgroundColor: '#d66b' };
        } if (width > 60) {
          // Yellow
          return { backgroundColor: '#dd6b' };
        }
        // Green
        return { backgroundColor: '#6d6b' };

      case 'red':
        return { backgroundColor: '#d66b' };
      case 'green':
        return { backgroundColor: '#6d6b' };
      case 'yellow':
        return { backgroundColor: '#dd6b' };
      case 'a':
        return { backgroundColor: '#009bb3bb' };
      case 'b':
        return { backgroundColor: '#008599bb' };
      case 'c':
        return { backgroundColor: '#006380bb' };
      case 'd':
        return { backgroundColor: '#855047bb' };
      case 'e':
        return { backgroundColor: '#633c36bb' };
      default:
        return { backgroundColor: '#cccb' };
    }
  },
);

const SimpleTable = css({
  marginLeft: 'auto',
  marginRight: 'auto',

  '& td': {
    paddingLeft: '1ex',
    paddingRight: '1ex',
    paddingTop: 0,
    paddingBottom: 0,
    margin: 0,
    textAlign: 'center',
  },
});

const TopProcsTable = styled.table({
  borderSpacing: 0,
  width: '100%',
  '& td': {
    paddingTop: 0,
    paddingBottom: 0,
  },
  '& td.pid': {
    width: '5ex',
    textAlign: 'right',
  },
  '& td.cpu': {
    textAlign: 'right',
    width: '7ex',
  },
  '& td.name': {
    paddingLeft: '0.5em',
  },
});

const KVListStyle = (wide) => css({
  margin: 0,
  '& dt': {
    float: 'left',
    margin: 0,
    width: wide ? '50%' : '25%',
    fontWeight: 500,
  },
  '& dd': {
    float: 'left',
    margin: 0,
    width: wide ? '50%' : '75%',
  },
  '&:after': {
    display: 'block',
    clear: 'both',
    content: '""',
  },
});

const ErrorStyle = css({
  color: 'red',
});

//
// Generic components
//

// This loads the fontawesome CSS needed for icons
const FontAwesome = () => (
  <link rel="stylesheet" href="https://use.fontawesome.com/releases/v5.15.3/css/all.css" />
);

const Icon = ({ name }) => <i className={`fa fa-${name}`} />;

const Module = ({ title, icon, children }) => (
  <div>
    <ModuleTitle>
      <Icon name={icon} />
      {' '}
      {title}
    </ModuleTitle>
    {children}
  </div>
);

const KVList = ({ wide, items, children }) => {
  // Wrapped Definition list. You can pass a map in as the items prop, or you
  // can just provide children directly, or both (children will be after the
  // provided items)
  const renderedItems = Object.keys(items || {}).map(
    (k) => (
      <>
        <dt key={k}>{k}</dt>
        <dd>{items[k]}</dd>
      </>
    ),
  );
  return (
    <dl className={KVListStyle(wide)}>
      {renderedItems}
      {children}
    </dl>
  );
};

const GenericList = ({ items, children }) => (
  // Wrapped UL. Similar to KVList you can pass in an items prop or just li
  // items as children, or both.
  <ul className={css('list-style: none; margin: 0; padding: 0')}>
    {(items || []).map((i) => <li>{i}</li>)}
    {children}
  </ul>
);

//
// Module code
//
const Hostname = () => {
  const [hostname, setHostname] = useState('-');

  useTimedCommand(10000, 'hostname', (output) => setHostname(output));

  return (
    <TopLevelHeader>{hostname}</TopLevelHeader>
  );
};

const CpuMemory = () => {
  // CPU
  const [totalUsage, setTotalUsage] = useState(0.0);
  // Memory
  const [active, setActive] = useState(0);
  const [wired, setWired] = useState(0);
  const [speculative, setSpeculative] = useState(0);
  const [compressed, setCompressed] = useState(0);
  const [cached, setCached] = useState(0);
  const [free, setFree] = useState(0);

  useTimedCommand(2000, 'ps -A -o %cpu', (output) => {
    // Total CPU
    setTotalUsage(output.split('\n')
      .map((l) => parseFloat(l) || 0.0)
      .reduce((t, n) => t + n));
  });

  useTimedCommand(2000, 'vm_stat', (output) => {
    const stats = {};
    let pageSize = 0;

    output.split('\n').forEach((line) => {
      let m = line.match(/page size of (\d+) bytes/);
      if (m) {
        pageSize = parseInt(m[1], 10);
      } else {
        m = line.match(/^(.*):\s+(\d+)\.$/);
        if (m) {
          stats[m[1]] = parseInt(m[2], 10);
          if (m[1].match(/[Pp]ages/)) {
            stats[m[1]] *= pageSize;
          }
        }
      }
    });

    setActive(stats['Pages active']);
    setWired(stats['Pages wired down']);
    setSpeculative(stats['Pages speculative']);
    setCompressed(stats['Pages occupied by compressor']);
    setCached(stats['File-backed pages']);
    setFree(stats['Pages free']);
  });

  // The total memory is used by the bars
  const totalMem = active + wired + speculative + compressed + cached + free;

  return (
    <Module title="CPU/Memory" icon="laptop">
      <BarHeader>
        CPU:
        {totalUsage.toPrecision(3)}
        %
      </BarHeader>
      <Bar><Segment width={Math.min(totalUsage, 100)} color="auto" /></Bar>
      <table className={SimpleTable}>
        <tbody>
          <tr>
            <td>
              Ac:
              {humanize(active)}
              B
            </td>
            <td>
              Wi:
              {humanize(wired)}
              B
            </td>
            <td>
              Sp:
              {humanize(speculative)}
              B
            </td>
          </tr>
          <tr>
            <td>
              Co:
              {humanize(compressed)}
              B
            </td>
            <td>
              Ca:
              {humanize(cached)}
              B
            </td>
            <td>
              Fr:
              {humanize(free)}
              B
            </td>
          </tr>
        </tbody>
      </table>
      <Bar>
        <Segment color="a" width={((active + wired + speculative + compressed + cached) / totalMem) * 100} />
        <Segment color="b" width={((active + wired + speculative + compressed) / totalMem) * 100} />
        <Segment color="c" width={((active + wired + speculative) / totalMem) * 100} />
        <Segment color="d" width={((active + wired) / totalMem) * 100} />
        <Segment color="e" width={(active / totalMem) * 100} />
      </Bar>
    </Module>
  );
};

const TopProcs = () => {
  const [procs, setProcs] = useState([]);

  useTimedCommand(2000, "ps axro 'pid, %cpu, ucomm'", (output) => {
    setProcs(output.split('\n')
      .slice(1, 6)
      .map((p) => p.match(/\S+/g))
      .map((m) => ({ pid: m[0], cpu: m[1], name: m[2] })));
  });

  const topProcs = procs.map((p) => (
    <tr key={p.pid}>
      <td>{p.pid}</td>
      <td>{p.cpu}</td>
      <td>{p.name}</td>
    </tr>
  ));

  return (
    <Module title="Top Processes" icon="trophy">
      <TopProcsTable>
        <tbody>
          {topProcs}
        </tbody>
      </TopProcsTable>
    </Module>
  );
};

const DiskSpace = () => {
  const [total, setTotal] = useState(1);
  const [used, setUsed] = useState(0);
  const [free, setFree] = useState(0);

  useTimedCommand(10000, 'df -k /', (output) => {
    const lines = output.split('\n');
    const lastline = lines[lines.length - 2];
    const [, newTotal, , newFree] = lastline.split(/\s+/);

    setTotal(newTotal);
    // We don't use the used column from df here as it only gives us the used
    // space on the current filesystem. This gets us the used space on the
    // entire disk.
    setUsed(newTotal - newFree);
    setFree(newFree);
  });

  return (
    <Module title="Disk Space" icon="hdd">
      <table className={SimpleTable}>
        <tbody>
          <tr>
            <td>
              U
              {humanize(used * 1024)}
              B
            </td>
            <td>
              F
              {humanize(free * 1024)}
              B
            </td>
            <td>
              T
              {humanize(total * 1024)}
              B
            </td>
            <td>
              {parseInt((100 * used) / total, 10)}
              %
            </td>
          </tr>
        </tbody>
      </table>
      <Bar><Segment color="auto" width={(100 * used) / total} /></Bar>
    </Module>
  );
};

const Network = () => {
  const [interfaces, setInterfaces] = useState({});
  const [nameservers, setNameservers] = useState([]);

  useTimedCommand(10000, 'ifconfig -a', (output) => {
    const ipInfo = {};
    let curIf = '';
    output.split('\n').forEach((line) => {
      // Interface name
      const ifMatch = line.match(/^(?<ifName>[a-z0-9]+):/);
      if (ifMatch) {
        curIf = ifMatch.groups.ifName;
        ipInfo[curIf] = [];
      } else {
        // Ip address
        const ipMatch = line.match(/^\s+inet6? ([0-9a-f.:]+)/);
        if (ipMatch && !/^(fe80|fd00)/.test(ipMatch[1])) {
          ipInfo[curIf].push(ipMatch[1]);
        }
      }
    });
    setInterfaces(Object.fromEntries(Object.entries(ipInfo).filter(
      ([iface, ips]) => (iface !== 'lo0' && ips.length > 0),
    )));
  });

  useTimedCommand(10000, 'cat /etc/resolv.conf', (output) => {
    const ns = [];
    output.split('\n').forEach((line) => {
      const m = line.match(/^nameserver (\S+)/);
      if (m) {
        ns.push(m[1]);
      }
    });
    setNameservers(ns);
  });

  const ifInfo = Object.keys(interfaces).map((ifName) => (
    <>
      <dt key={ifName}>{ifName}</dt>
      <dd>{interfaces[ifName].join(', ')}</dd>
    </>
  ));

  return (
    <Module title="Network" icon="cloud">
      <KVList>
        {ifInfo}
        <dt key="DNS">DNS</dt>
        <dd>{nameservers.join(', ')}</dd>
      </KVList>
    </Module>
  );
};

const Wifi = () => {
  const [wifiInfo, setWifiInfo] = useState({});

  useTimedCommand(10000, '/System/Library/PrivateFrameworks/Apple80211.framework/Versions/Current/Resources/airport -I', (output) => {
    const newWifiInfo = {};
    output.split('\n').forEach((line) => {
      const m = line.match(/^\s*(?<key>\S+): (?<value>.*)/);
      if (m) {
        newWifiInfo[m.groups.key] = m.groups.value;
      }
    });

    // Show SNR value
    if (newWifiInfo.agrCtlRSSI) {
      newWifiInfo.SNR = parseInt(newWifiInfo.agrCtlRSSI, 10)
        - parseInt(newWifiInfo.agrCtlNoise, 10);
    }

    setWifiInfo(newWifiInfo);
  });

  let wifiItems;
  if (wifiInfo.AirPort === 'Off') {
    wifiItems = { Wifi: 'Off' };
  } else {
    wifiItems = {
      SSID: wifiInfo.SSID,
      BSSID: wifiInfo.BSSID,
      Speed: `${wifiInfo.lastTxRate}Mbps /
        ${wifiInfo.maxRate}Mbps`,
      SNR: `${wifiInfo.SNR}dB`,
      Channel: wifiInfo.channel,
    };
  }

  return (
    <Module title="Wifi" icon="wifi">
      <KVList items={wifiItems} />
    </Module>
  );
};

const Bandwidth = () => {
  const [bandwidth, setBandwidth] = useState({});
  const oldTraffic = useRef(null);

  useTimedCommand(2000, 'netstat -inb', (output) => {
    const newTraffic = {
      timestamp: Date.now(),
      traffic: {},
    };

    output.split('\n').slice(1).forEach((line) => {
      const parts = line.split(/\s+/);
      if (parts[0]
          // netstat -ib duplicates lines for each interface (showing
          // different IPs), so we only need one of each.
          && !newTraffic.traffic[parts[0]]
          // Skip localhost
          && parts[0] !== 'lo0') {
        newTraffic.traffic[parts[0]] = [parts[6], parts[9]];
      }
    });

    if (oldTraffic.current !== null) {
      const newBandwidth = {};
      const timeDiff = (newTraffic.timestamp - oldTraffic.current.timestamp);

      Object.keys(oldTraffic.current.traffic).sort().forEach((k) => {
        const oldv = oldTraffic.current.traffic[k];
        const newv = newTraffic.traffic[k] || [0, 0];
        const bytesInRaw = ((parseInt(newv[0], 10) - parseInt(oldv[0], 10)) * 1000) / timeDiff;
        const bytesOutRaw = ((parseInt(newv[1], 10) - parseInt(oldv[1], 10)) * 1000) / timeDiff;
        const bytesIn = humanize(bytesInRaw);
        const bytesOut = humanize(bytesOutRaw);
        if (bytesInRaw > 0 || bytesOutRaw > 0) {
          newBandwidth[k] = `IN: ${bytesIn}Bps / OUT: ${bytesOut}Bps`;
        }
      });
      setBandwidth(newBandwidth);
    }
    oldTraffic.current = newTraffic;
  });

  return (
    <Module title="Bandwidth" icon="download">
      <KVList items={bandwidth} />
    </Module>
  );
};

const Ping = () => {
  const defaultRoute = useRef();
  const pingConfig = moduleConfig.ping;
  // List of state hooks
  const pingTimes = {};
  const pingTimeouts = {};
  pingConfig.hosts.concat(pingConfig.additional_home_hosts).forEach((host) => {
    const [value, set] = useState('-');
    pingTimes[host] = { value, set };
    pingTimeouts[host] = useRef(0);
  });

  // Get (and keep up to date) the default route
  useTimedCommand(10000, 'netstat -nr', (output) => {
    output.split('\n').forEach((line) => {
      const m = line.match(/^default\s+(?<ip>[0-9.]+)/);
      if (m) {
        defaultRoute.current = m.groups.ip;
      }
    });
  });

  useRecurringTimer(5000, () => {
    let pingHosts = pingConfig.hosts;
    if (defaultRoute.current === pingConfig.home_router) {
      pingHosts = pingHosts.concat(pingConfig.additional_home_hosts);
    }

    pingHosts.forEach((host) => {
      // Replace "default_route" with the actual default route if it's present
      const realHost = host === 'default_route' ? defaultRoute.current : host;
      if (host === 'default_route' && realHost === undefined) {
        // We don't know the default route yet, just skip it
        return;
      }
      run(`ping -n -c 1 -W 1 ${realHost}`).then((output) => {
        if (output) {
          const m = output.match(/^round-trip \S+ = ([^/]+)/m);
          if (m) {
            pingTimes[host].set(`${m[1]}ms`);
            pingTimeouts[host].current = 0;
          } else if (output.includes('0 packets received')) {
            if (pingTimeouts[host].current > 5) {
              // If there have been many timeouts, e.g. you have a default route
              // that doesn't respond to pings, don't keep on printing TIMEOUT
              // in red. Make it a smaller timeout instead.
              pingTimes[host].set('timeout');
            } else {
              pingTimeouts[host].current += 1;
              pingTimes[host].set('TIMEOUT');
            }
          } else {
            // We didn't error out (e.g. due to a timeout), but couldn't match
            // the expected output of ping. Just print UNKNOWN for now.
            pingTimes[host].set('UNKNOWN');
          }
        }
      }).catch(() => {
        // Some other error happened, print it out
        pingTimes[host].set('ERROR');
      });
    });
  });

  let pingHosts = pingConfig.hosts;
  if (defaultRoute.current === pingConfig.home_router) {
    pingHosts = pingHosts.concat(pingConfig.additional_home_hosts);
  }
  const pingItems = pingHosts.map((host) => {
    const realHost = host === 'default_route' ? defaultRoute.current : host;
    let pingClassName = '';
    if (pingTimes[host].value === 'TIMEOUT') {
      pingClassName = ErrorStyle;
    }
    return (
      <>
        <dt key={realHost}>{realHost}</dt>
        <dd className={pingClassName}>{pingTimes[host].value}</dd>
      </>
    );
  });

  return (
    <Module title="Ping" icon="industry">
      <KVList wide>
        {pingItems}
      </KVList>
    </Module>
  );
};

const RunningVMs = () => {
  const [runningVMs, setRunningVMs] = useState();

  useTimedCommand(10000, '/usr/local/bin/VBoxManage list runningvms',
    (output) => {
      const currentRunningVMs = [];
      output.split('\n').forEach((line) => {
        const m = line.match(/"([^"]+)"/);
        if (m) {
          let vmname = m[1];
          // Detect vagrant machine names and prettify them
          const vagrantmatch = vmname.match(/^(.+?)_([^_]+)_[0-9_]+$/);
          if (vagrantmatch) {
            vmname = `${vagrantmatch[1]} (${vagrantmatch[2]})`;
          }
          currentRunningVMs.push(`vbox - ${vmname}`);
        }
      });
      setRunningVMs(currentRunningVMs);
    });

  return (
    <Module title="Running VMs" icon="server">
      <GenericList items={runningVMs} />
    </Module>
  );
};

// eslint-disable-next-line no-unused-vars
const DebugInfo = () => {
  const [timerCount, setTimerCount] = useState();

  useRecurringTimer(1000, () => {
    setTimerCount(TimerCount);
  });
  return (
    <Module title="Debug" icon="bug">
      <KVList>
        <dt>Timers:</dt>
        <dd>{timerCount}</dd>
      </KVList>
    </Module>
  );
};

// Main render function - add modules here
export const render = () => (
  <>
    <FontAwesome />
    <div>
      <Background />
      <Hostname />
      <CpuMemory />
      <TopProcs />
      <DiskSpace />
      <Network />
      <Wifi />
      <Bandwidth />
      <Ping />
      <RunningVMs />
    </div>
  </>
);
