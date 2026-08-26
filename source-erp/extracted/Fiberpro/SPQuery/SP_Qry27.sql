/*;=============================================   
; Author           :  Global Software's    
; Create date      :  06/05/2023 
; Create By        :  ASLAM  
; Description      :  QUERY
; Change Person    :  SWETHA
; Last Change Date :  27/05/2024 12.36 PM 
; =============================================  */  

      
 CREATE PROCEDURE SP_Qry27 (@Ordid int) AS
BEGIN


select sum(amount) as amount,sum(kgs) as kgs from (  select Sum(y.amount) as amount,sum(y.kg ) as kgs from 
  (select distinct Trs_FabAllot1.Ordid,isnull((trs_del2.rate)*(sum(trs_del2.kg)),0) as amount,sum(trs_del2.kg) as kg   from Trs_FabAllot2 c inner join Trs_FabAllot1 on Trs_FabAllot1.id = c.id inner join Trs_Del2 on trs_DEL2.OrdId = Trs_FabAllot1.Ordid inner         join trs_del1 on trs_del1.id = trs_del2.id inner join StockTable  D on D.StockID = Trs_Del2.StockID  and D.OrdId =c.YarnLotOrdid and D.FabID =c.FabId_1 and D.ColID  = c.ColId_1 and D.CntID =c.CntId_1 and D.DiaID =c.Diaid_1 and D.gsm =c.Gsm_1 and D.LL =c.LL_1  where  Trs_FabAllot1.Ordid = @Ordid  and Prs_Dept =11  and c.DeptId = 31  and TrType = 1 group by trs_del2.rate ,AllotKgs,Trs_FabAllot1.Ordid,trs_del2.kg )y group by Ordid 
  --and D.PRINT_DESIGNID  =c.DesignId_1   Ardeur TicketNo-1204
  union all
   select distinct amount as amount,kg as kgs from ( select (isnull(sum(trs_del2.kg),0) * isnull(D.Rate,0)) as amount,isnull(sum(trs_del2.Kg),0) as kg  from  Trs_FabAllot2 c  inner join Trs_FabAllot1 on Trs_FabAllot1.id = c.id inner join Trs_Del2 on trs_DEL2.OrdId = Trs_FabAllot1.Ordid inner         join trs_del1 on trs_del1.id = trs_del2.id inner join StockTable  D on D.StockID = Trs_Del2.StockID  and D.OrdId =c.YarnLotOrdid and D.FabID =c.FabId_1 and D.ColID  = c.ColId_1 and D.CntID =c.CntId_1 and D.DiaID =c.Diaid_1 and D.gsm =c.Gsm_1 and D.LL =c.LL_1  and D.Dept = C.DeptId  where  Trs_FabAllot1.Ordid = @Ordid and c.DeptId<>31 and TrType = 1 GROUP BY D.Rate )x)x
 --and D.PRINT_DESIGNID  =c.DesignId_1   Ardeur TicketNo-1204
END




