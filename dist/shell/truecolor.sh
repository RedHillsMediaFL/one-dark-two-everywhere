# Source from zshenv/bash startup; do not use *-direct TERM identities.
case ${TERM-} in
  ''|dumb) ;;
  *)
    export COLORTERM=truecolor
    if [ -t 0 ] || [ -t 1 ] || [ -n "${SSH_TTY-}" ] || [ -n "${TMUX-}" ]; then
      unset NO_COLOR
    fi
    ;;
esac
