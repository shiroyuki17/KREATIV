import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Dockerfile нь package.json-ыг build context-оос COPY хийхийн оронд ӨӨРӨӨ
// дотроо бичдэг (шалтгааныг Dockerfile-ийн толгойн тайлбараас үзнэ үү).
// Энэ нь хоёр жагсаалтыг гараар синк байлгахыг шаарддаг бөгөөд нэг удаа
// мартахад production deploy унасан:
//
//   Error: Cannot find package 'stripe' imported from /app/src/lib/payments/stripe.js
//
// Локал node_modules-д багц байсаар байдаг тул зөрүү нь ЗӨВХӨН deploy дээр
// илэрдэг — хамгийн үнэтэй газар. Энэ тест түүнийг локал дээр барина.
const here = path.dirname(fileURLToPath(import.meta.url));
const backendRoot = path.join(here, '../..');

function inlineDockerDependencies() {
  const dockerfile = fs.readFileSync(path.join(backendRoot, 'Dockerfile'), 'utf8');
  // `RUN cat <<'PKGJSON' > package.json` ба `PKGJSON` хоёрын хоорондох JSON.
  const match = dockerfile.match(/<<'PKGJSON'[^\n]*\n([\s\S]*?)\nPKGJSON/);
  if (!match) throw new Error('Dockerfile-аас PKGJSON heredoc олдсонгүй');
  return JSON.parse(match[1]).dependencies || {};
}

describe('Dockerfile-ийн inline package.json', () => {
  const real = JSON.parse(
    fs.readFileSync(path.join(backendRoot, 'package.json'), 'utf8')
  ).dependencies || {};
  const inDocker = inlineDockerDependencies();

  it('package.json-ийн БҮХ dependency-г агуулна', () => {
    const missing = Object.keys(real).filter((name) => !(name in inDocker));
    expect(
      missing,
      `Dockerfile-д дутуу: ${missing.join(', ')} — Dockerfile доторх PKGJSON блокт нэмнэ үү`
    ).toEqual([]);
  });

  it('байхгүй болсон dependency-г агуулаагүй', () => {
    const extra = Object.keys(inDocker).filter((name) => !(name in real));
    expect(
      extra,
      `Dockerfile-д илүү: ${extra.join(', ')} — package.json-оос хасагдсан байна`
    ).toEqual([]);
  });

  it('хувилбарууд яг таарна', () => {
    const mismatched = Object.keys(real)
      .filter((name) => name in inDocker && inDocker[name] !== real[name])
      .map((name) => `${name}: package.json=${real[name]} docker=${inDocker[name]}`);
    expect(mismatched, `Хувилбар зөрүүтэй:\n${mismatched.join('\n')}`).toEqual([]);
  });
});
