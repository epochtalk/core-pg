CREATE TABLE backoff (
  ip character varying(40),
  route character varying (255),
  method character varying (15),
  created_at timestamp with time zone
);

CREATE INDEX index_ip_route_method_on_backoff ON backoff USING btree (ip, route, method);
