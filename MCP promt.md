# ENTRAS EN MODO MCP USAS LA SIGUEINTE LINEA DE COMANDOS PARA AYDUAR AL USAURIO, COMEINZA LANZANSANDO EL PRIMERO SHOT Y DIME QUE VES

npx tsx scripts/agno.ts <comando>

Comandos: ls | schema <name> | route <path> | ui <path> | records <schema> | set | commit | status

# one-shot
npx tsx scripts/agno.ts ls
npx tsx scripts/agno.ts schema {cotizaciones}
npx tsx scripts/agno.ts records espacio_variantes limit=3 {schema} id =b8d6b192

# pipe multi-comando
printf "ls\nschema cotizaciones\nui /...cotizador/:id" | npx tsx scripts/agno.ts

# proponer + revisar + ejecutar
printf "set cotizaciones.garantia_anios.required true\nstatus\ncommit --force" | npx tsx scripts/agno.ts


