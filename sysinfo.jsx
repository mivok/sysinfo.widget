import { React, run, css, styled } from "uebersicht";

// React hooks are part of the React object, so we don't import them like we
// would in normal react, but just set variables instead
const useState = React.useState;
const useEffect = React.useEffect;

// Configuration
const module_config = {
  "ping": {
    // Which hosts to ping
    "hosts": [
      "default_route",
      "8.8.8.8",
      "www.verizon.com"
    ],
    // Additional hosts to ping if at home
    // If your default route matches this, then ping additional hosts at
    // home
    home_router: "192.168.1.1",
    additional_home_hosts: ["192.168.1.3"],
  }
}

//
// Helper functions
//

// Wrapper around setTimeout for an infinitely running timer
const recurringTimer = (interval, callback, run_immediately = true) => {
    const timer = setTimeout(() => {
        // Make sure we start another instance of the timer first
        recurringTimer(interval, callback);
        // Then call the callback
        callback();
    }, interval);

    // Allow calling the callback immediately for instant updates
    if (run_immediately) {
        callback();
    }
    return timer;
}

// Wrapper around recurringTimer for use as a react hook (use this for setting
// a recurring timer inside a functional react component)
const useRecurringTimer = (interval, callback) => {
    useEffect(() => {
      let timer = recurringTimer(interval, callback);

      // Cancel the recurring timer when cleaning up
      return () => {
        clearTimeout(timer);
      }
    }, []);
}

// Wrapper around useRecurringTimer for running a command at regular intervals
// and doing something with the output
const useTimedCommand = (interval, command, callback) => {
    useRecurringTimer(interval, () => run(command).then(callback));
}

// Turns a size into human units (e.g. 1000 = 1k)
const humanize = (value) => {
    // Convert a value to human readable numbers (e.g. 1024 -> 1k)
    const suffixes = "kMGT";
    let idx = -1;
    let suffix = "";
    while (value >= 1024) {
        value = value / 1024.0;
        idx += 1;
    }
    if (idx >= 0) {
        suffix = suffixes[idx];
    }

    // toPrecision does significant figures, but values >1000 turn into
    // scientific notation, and we don't need to worry about precision there,
    // so just print the value as is with no decimals.
    if (value >= 1000) {
        return `${value.toFixed(0)}${suffix}`;
    } else {
        return `${value.toPrecision(3)}${suffix}`;
    }
}

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
}

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
  borderBottom: '1px solid desaturate(lighten(base-color, 10), 60)',
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
  ({width}) => ({
    width: `${width}%`,
  }),
  ({color, width}) => {
    switch (color) {
      case 'auto':
        // Audo sets the color to green/yellow/red based on a threshold
        if (width > 80) {
          // Red
          return {backgroundColor: '#d66b'}
        } else if (width > 60) {
          // Yellow
          return {backgroundColor: '#dd6b'}
        } else {
          // Green
          return {backgroundColor: '#6d6b'}
        }
      case 'red':
        return {backgroundColor: '#d66b'}
      case 'green':
        return {backgroundColor: '#6d6b'}
      case 'yellow':
        return {backgroundColor: '#dd6b'}
      case 'a':
        return {backgroundColor: '#009bb3bb'}
      case 'b':
        return {backgroundColor: '#008599bb'}
      case 'c':
        return {backgroundColor: '#006380bb'}
      case 'd':
        return {backgroundColor: '#855047bb'}
      case 'e':
        return {backgroundColor: '#633c36bb'}
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
  }
})

/* Original styles
    table#top-procs
        borderSpacing: 0,
        width: '100%',

    table#top-procs td
        padding-top: 0,
        padding-bottom: 0,

    table#top-procs td.pid
        width: '5ex',
        textAlign: 'right',

    table#top-procs td.cpu
        textAlign: 'right',
        width: '7ex',

    table#top-procs td.name
        paddingLeft: '0.5em',

    dl
        margin: 0,

    dd
        float: 'left',
        margin: 0,
        width: '75%',

    dt
        float: 'left',
        margin: 0,
        width: '25%',
        fontWeight: 500,

    dl:after
        display: 'block',
        clear: 'both',
        content: '',

    dl.wide dd, dl.wide dt
        width: '50%',

    .error
        color: 'red',

    ul.blank
        listStyle: 'none',
        margin: 0,
        padding: 0,
*/

//
// Generic components
//

const Icon = ({name}) => <i className={`fa fa-${name}`}></i>;

const Module = ({title, icon, children}) => {
  return(
    <div>
      <ModuleTitle><Icon name={icon} />{title}</ModuleTitle>
      {children}
    </div>
  );
}


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
            .reduce((t, n) => t + n)
        );
    });

    useTimedCommand(2000, 'vm_stat', (output) => {
        const stats = {}
        let page_size = 0

        for (const line of output.split("\n")) {
            let m = line.match(/page size of (\d+) bytes/)
            if (m) {
                page_size = parseInt(m[1])
                continue
            }
            m = line.match(/^(.*):\s+(\d+)\.$/)
            if (m) {
                stats[m[1]] = parseInt(m[2])
                if (m[1].match(/[Pp]ages/)) {
                    stats[m[1]] *= page_size
                }
            }
        }

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
          <BarHeader>CPU: {totalUsage.toPrecision(3)}%</BarHeader>
          <Bar><Segment width={Math.min(totalUsage, 100)} color="auto" /></Bar>
          <table className={SimpleTable}>
            <tbody>
              <tr>
                  <td>Ac: {humanize(active)}B</td>
                  <td>Wi: {humanize(wired)}B</td>
                  <td>Sp: {humanize(speculative)}B</td>
              </tr>
              <tr>
                  <td>Co: {humanize(compressed)}B</td>
                  <td>Ca: {humanize(cached)}B</td>
                  <td>Fr: {humanize(free)}B</td>
              </tr>
            </tbody>
          </table>
          <Bar>
              <Segment color="a" width={(active + wired + speculative + compressed + cached) / totalMem * 100} />
              <Segment color="b" width={(active + wired + speculative + compressed) / totalMem * 100} />
              <Segment color="c" width={(active + wired + speculative) / totalMem * 100} />
              <Segment color="d" width={(active + wired) / totalMem * 100} />
              <Segment color="e" width={active / totalMem * 100} />
          </Bar>
      </Module>
    );
}

// Main render function - add modules here
export const render = (state) => (
  <div>
    <Background />
    <Hostname />
    <CpuMemory />
  </div>
);
