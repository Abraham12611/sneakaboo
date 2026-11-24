export default async function(req) {
  return Response.json({ ok: true, service: 'sneakaboo', time: new Date().toISOString() });
}
